import CsvParserWorker from '$lib/csv-parser.worker?worker&inline';
import type { DashboardData } from '$lib/feature/top/graph/chart-types';

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

export type WorkerRequest = {
	file: Blob;
	unknownModel: string;
};

type WorkerSuccess = {
	type: 'success';
	dashboard: DashboardData;
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
	const timestamps: number[] = [];
	for (let rowIndex = 1; rowIndex < records.length; rowIndex += 1) {
		const record = records[rowIndex];
		const date = record[dateIndex]?.trim() ?? '';
		if (!isoDateTimePattern.test(date)) continue;
		const timestamp = Date.parse(date);
		if (!Number.isFinite(timestamp)) continue;

		const model = record[modelIndex]?.trim() ?? '';
		const tokens = parseTokens(record, tokenIndex, inputTokenIndex, outputTokenIndex);
		const tokenBreakdown = parseTokenBreakdown(record, {
			inputWithCacheWriteIndex,
			inputWithoutCacheWriteIndex,
			cacheReadIndex,
			outputTokenIndex
		});
		const parsedCost = parseCost(record[costIndex]);
		if (parsedCost !== null) {
			points.push({ date, model, tokens, ...tokenBreakdown, ...parsedCost });
			timestamps.push(timestamp);
		}
	}

	if (points.length === 0) {
		throw new CsvParseError('no_valid_data');
	}

	return sortPointsByTimestamp(points, timestamps);
}

function normalizeHeader(value: string) {
	return value
		.replace(/^\uFEFF/, '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

function findHeaderIndex(headers: string[], names: string[]) {
	for (const name of names) {
		const index = headers.indexOf(name);
		if (index !== -1) return index;
	}
	return -1;
}

function sortPointsByTimestamp(points: CsvPoint[], timestamps: number[]): CsvPoint[] {
	const order = timestamps.map((_, index) => index);
	order.sort((left, right) => timestamps[left] - timestamps[right]);
	return order.map((index) => points[index]);
}

function parseCost(value: string | undefined): Pick<CsvPoint, 'cost'> | null {
	const rawCost = value?.trim() ?? '';
	if (rawCost === '') return { cost: null };

	const normalized = rawCost.toLowerCase();
	if (normalized === 'free' || normalized === '-' || normalized === 'included') {
		return { cost: null };
	}

	const cost = Number(rawCost);
	return Number.isFinite(cost) ? { cost } : null;
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
 * Sends the file to a dedicated worker. The worker parses rows and groups them
 * there, then posts back only the compact dashboard payload.
 */
export function parseCsvFile(file: Blob, unknownModel: string): Promise<DashboardData> {
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
				resolve(event.data.dashboard);
			} else {
				reject(new CsvParseError(event.data.code));
			}
		};
		worker.onerror = () => {
			finish();
			reject(new CsvParseError('background_parsing_failed'));
		};
		const request: WorkerRequest = { file, unknownModel };
		worker.postMessage(request);
	});
}

/**
 * Parses CSV records with the same quoting rules as before, but quoted fields are
 * scanned with `indexOf` and unquoted fields are copied with `slice`. Concatenating
 * one character at a time was the dominant cost on Cursor usage exports, which quote
 * every cell.
 */
function parseRecords(text: string): string[][] {
	const records: string[][] = [];
	const length = text.length;
	let record: string[] = [];
	let start = 0;
	let field = '';
	let hasChunks = false;
	let insideQuotes = false;

	const pushField = (end: number) => {
		const chunk = text.slice(start, end);
		record.push(hasChunks ? field + chunk : chunk);
		field = '';
		hasChunks = false;
		start = end + 1;
	};
	const pushRecord = (end: number) => {
		pushField(end);
		if (record.some((value) => value.trim() !== '')) records.push(record);
		record = [];
	};

	let index = 0;
	while (index < length) {
		if (insideQuotes) {
			const quoteIndex = text.indexOf('"', index);
			if (quoteIndex === -1) throw new CsvParseError('unclosed_quotes');
			if (text[quoteIndex + 1] === '"') {
				field += `${text.slice(start, quoteIndex)}"`;
				hasChunks = true;
				index = quoteIndex + 2;
				start = index;
				continue;
			}

			field += text.slice(start, quoteIndex);
			hasChunks = true;
			insideQuotes = false;
			index = quoteIndex + 1;
			start = index;
			continue;
		}

		const character = text[index];
		if (character === '"') {
			if (index > start || hasChunks) {
				field += text.slice(start, index);
				hasChunks = true;
			}
			insideQuotes = true;
			index += 1;
			start = index;
			continue;
		}
		if (character === ',') {
			pushField(index);
			index += 1;
			continue;
		}
		if (character === '\n' || character === '\r') {
			pushRecord(index);
			if (character === '\r' && text[index + 1] === '\n') index += 1;
			index += 1;
			start = index;
			continue;
		}

		index += 1;
	}

	if (insideQuotes) throw new CsvParseError('unclosed_quotes');
	if (start < length || record.length > 0 || hasChunks) pushRecord(length);

	return records;
}
