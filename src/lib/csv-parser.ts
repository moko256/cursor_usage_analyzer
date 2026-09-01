import CsvParserWorker from '$lib/csv-parser.worker?worker&inline';

export type TokenBreakdown = {
	inputWithCacheWrite: number;
	inputWithoutCacheWrite: number;
	cacheRead: number;
	outputTokens: number;
};

export type CsvPoint = {
	date: string;
	model: string;
	cost: number | null;
	tokens: number;
	kind: 'amount' | 'included' | 'free' | 'empty';
} & TokenBreakdown;

export type CsvParseErrorCode =
	| 'empty'
	| 'missing_columns'
	| 'no_valid_data'
	| 'background_parsing_unavailable'
	| 'background_parsing_failed'
	| 'unclosed_quotes'
	| 'parse_failed';

export class CsvParseError extends Error {
	constructor(public readonly code: CsvParseErrorCode) {
		super(code);
		this.name = 'CsvParseError';
	}
}

type WorkerSuccess = {
	type: 'success';
	points: CsvPoint[];
};

type WorkerFailure = {
	type: 'error';
	code: CsvParseErrorCode;
};

const isoDateTimePattern =
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/;

/**
 * Parses only the columns used by the charts. This function is shared with the
 * worker so it can be unit-tested without constructing a browser Worker.
 */
export function parseCsvText(text: string): CsvPoint[] {
	const records = parseRecords(text);
	if (records.length === 0) {
		throw new CsvParseError('empty');
	}

	const headers = records[0].map((header) => normalizeHeader(header));
	const dateIndex = headers.indexOf('date');
	const costIndex = headers.indexOf('cost');
	const modelIndex = headers.indexOf('model');
	const tokenIndex = findHeaderIndex(headers, ['tokens', 'token', 'totaltokens']);
	const inputTokenIndex = findHeaderIndex(headers, ['inputtokens', 'inputtoken']);
	const outputTokenIndex = findHeaderIndex(headers, ['outputtokens', 'outputtoken']);
	const inputWithCacheWriteIndex = headers.indexOf('inputwcachewrite');
	const inputWithoutCacheWriteIndex = headers.indexOf('inputwocachewrite');
	const cacheReadIndex = headers.indexOf('cacheread');

	if (dateIndex === -1 || costIndex === -1 || modelIndex === -1) {
		throw new CsvParseError('missing_columns');
	}

	const points: CsvPoint[] = [];
	for (const record of records.slice(1)) {
		const date = record[dateIndex]?.trim() ?? '';
		if (!isIsoDateTime(date)) continue;

		const model = record[modelIndex]?.trim() ?? '';
		const tokens = parseTokens(record, tokenIndex, inputTokenIndex, outputTokenIndex);
		const tokenBreakdown = parseTokenBreakdown(record, {
			inputWithCacheWriteIndex,
			inputWithoutCacheWriteIndex,
			cacheReadIndex,
			outputTokenIndex
		});
		const parsedCost = parseCost(record[costIndex]);
		if (parsedCost !== null) points.push({ date, model, tokens, ...tokenBreakdown, ...parsedCost });
	}

	if (points.length === 0) {
		throw new CsvParseError('no_valid_data');
	}

	return points.toSorted((left, right) => Date.parse(left.date) - Date.parse(right.date));
}

function normalizeHeader(value: string) {
	return value
		.replace(/^\uFEFF/, '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

function findHeaderIndex(headers: string[], names: string[]) {
	return names.map((name) => headers.indexOf(name)).find((index) => index !== -1) ?? -1;
}

function parseCost(value: string | undefined): Pick<CsvPoint, 'cost' | 'kind'> | null {
	const rawCost = value?.trim() ?? '';
	if (rawCost === '') return { cost: null, kind: 'empty' };

	const normalized = rawCost.toLowerCase();
	if (normalized === 'free' || normalized === '-') return { cost: null, kind: 'free' };
	if (normalized === 'included') return { cost: null, kind: 'included' };

	const cost = Number(rawCost);
	return Number.isFinite(cost) ? { cost, kind: 'amount' } : null;
}

function parseNonNegativeNumber(value: string | undefined) {
	const number = Number(value?.trim() ?? '');
	return Number.isFinite(number) && number >= 0 ? number : 0;
}

function parseTokens(
	record: string[],
	tokenIndex: number,
	inputTokenIndex: number,
	outputTokenIndex: number
) {
	if (tokenIndex !== -1) return parseNonNegativeNumber(record[tokenIndex]);

	return (
		parseNonNegativeNumber(record[inputTokenIndex]) +
		parseNonNegativeNumber(record[outputTokenIndex])
	);
}

function parseTokenBreakdown(
	record: string[],
	indices: {
		inputWithCacheWriteIndex: number;
		inputWithoutCacheWriteIndex: number;
		cacheReadIndex: number;
		outputTokenIndex: number;
	}
): TokenBreakdown {
	return {
		inputWithCacheWrite: parseOptionalColumn(record, indices.inputWithCacheWriteIndex),
		inputWithoutCacheWrite: parseOptionalColumn(record, indices.inputWithoutCacheWriteIndex),
		cacheRead: parseOptionalColumn(record, indices.cacheReadIndex),
		outputTokens: parseOptionalColumn(record, indices.outputTokenIndex)
	};
}

function parseOptionalColumn(record: string[], index: number) {
	return index === -1 ? 0 : parseNonNegativeNumber(record[index]);
}

/**
 * Sends the file to a dedicated worker. The worker reads and parses the file,
 * returning only the Date, Model, Cost, and Total Tokens fields needed by the dashboard.
 */
export function parseCsvFile(file: Blob): Promise<CsvPoint[]> {
	return new Promise((resolve, reject) => {
		if (typeof Worker === 'undefined') {
			reject(new CsvParseError('background_parsing_unavailable'));
			return;
		}

		const worker = new CsvParserWorker();

		const finish = () => worker.terminate();
		worker.onmessage = (event: MessageEvent<WorkerSuccess | WorkerFailure>) => {
			finish();
			if (event.data.type === 'success') {
				resolve(event.data.points);
			} else {
				reject(new CsvParseError(event.data.code));
			}
		};
		worker.onerror = () => {
			finish();
			reject(new CsvParseError('background_parsing_failed'));
		};
		worker.postMessage(file);
	});
}

function isIsoDateTime(value: string) {
	return isoDateTimePattern.test(value) && Number.isFinite(Date.parse(value));
}

function parseRecords(text: string): string[][] {
	const records: string[][] = [];
	let record: string[] = [];
	let field = '';
	let insideQuotes = false;

	const pushField = () => {
		record.push(field);
		field = '';
	};
	const pushRecord = () => {
		pushField();
		if (record.some((value) => value.trim() !== '')) records.push(record);
		record = [];
	};

	for (let index = 0; index < text.length; index += 1) {
		const character = text[index];

		if (character === '"') {
			if (insideQuotes && text[index + 1] === '"') {
				field += '"';
				index += 1;
			} else {
				insideQuotes = !insideQuotes;
			}
		} else if (character === ',' && !insideQuotes) {
			pushField();
		} else if ((character === '\n' || character === '\r') && !insideQuotes) {
			pushRecord();
			if (character === '\r' && text[index + 1] === '\n') index += 1;
		} else {
			field += character;
		}
	}

	if (insideQuotes) throw new CsvParseError('unclosed_quotes');
	if (field !== '' || record.length > 0) pushRecord();

	return records;
}
