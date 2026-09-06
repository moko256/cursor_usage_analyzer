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
	/** Transferred ArrayBuffer of the CSV bytes; ownership moves to the worker. */
	buffer: ArrayBuffer;
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
 * Force a standalone string so V8 does not keep the whole CSV alive via a
 * sliced-string parent pointer after unused columns are dropped.
 */
function detachString(value: string): string {
	return value.length === 0 ? '' : value[0] + value.slice(1);
}

/**
 * Parses only the columns used by the charts. This function is shared with the
 * worker so it can be unit-tested without constructing a browser Worker.
 *
 * Records are visited one at a time so the full `string[][]` never sits beside
 * the extracted points.
 */
export function parseCsvText(text: string): CsvPoint[] {
	let headers: string[] | null = null;
	let dateIndex = -1;
	let costIndex = -1;
	let modelIndex = -1;
	let tokenIndex = -1;
	let inputTokenIndex = -1;
	let outputTokenIndex = -1;
	let inputWithCacheWriteIndex = -1;
	let inputWithoutCacheWriteIndex = -1;
	let cacheReadIndex = -1;

	const points: CsvPoint[] = [];
	const timestamps: number[] = [];
	let sawRecord = false;

	forEachRecord(text, (record) => {
		sawRecord = true;
		if (headers === null) {
			headers = record.map((header) => normalizeHeader(header));
			dateIndex = headers.indexOf('date');
			costIndex = headers.indexOf('cost');
			modelIndex = headers.indexOf('model');
			tokenIndex = findHeaderIndex(headers, ['tokens', 'token', 'totaltokens']);
			inputTokenIndex = findHeaderIndex(headers, ['inputtokens', 'inputtoken']);
			outputTokenIndex = findHeaderIndex(headers, ['outputtokens', 'outputtoken']);
			inputWithCacheWriteIndex = headers.indexOf('inputwcachewrite');
			inputWithoutCacheWriteIndex = headers.indexOf('inputwocachewrite');
			cacheReadIndex = headers.indexOf('cacheread');

			if (dateIndex === -1 || costIndex === -1 || modelIndex === -1) {
				throw new CsvParseError('missing_columns');
			}
			return;
		}

		const date = detachString(record[dateIndex]?.trim() ?? '');
		if (!isoDateTimePattern.test(date)) return;
		const timestamp = Date.parse(date);
		if (!Number.isFinite(timestamp)) return;

		const model = detachString(record[modelIndex]?.trim() ?? '');
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
	});

	if (!sawRecord) {
		throw new CsvParseError('empty');
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
 * Reads the blob into an ArrayBuffer, then transfers that buffer to a one-shot
 * worker. Uses `.then` (not `async`) so the Blob parameter is not kept alive
 * across the worker wait after the bytes are read. The worker is terminated
 * after it posts back the compact dashboard.
 */
export function parseCsvFile(file: Blob, unknownModel: string): Promise<DashboardData> {
	return file.arrayBuffer().then((buffer) => parseCsvArrayBuffer(buffer, unknownModel));
}

function parseCsvArrayBuffer(buffer: ArrayBuffer, unknownModel: string): Promise<DashboardData> {
	return new Promise((resolve, reject) => {
		if (typeof Worker === 'undefined') {
			reject(new CsvParseError('background_parsing_unavailable'));
			return;
		}

		const worker = new CsvParserWorker();
		let settled = false;

		const finish = () => {
			worker.onmessage = null;
			worker.onerror = null;
			worker.terminate();
		};

		worker.onmessage = (event: MessageEvent<WorkerSuccess | WorkerFailure>) => {
			if (settled) return;
			settled = true;
			finish();
			if (event.data.type === 'success') {
				resolve(event.data.dashboard);
			} else {
				reject(new CsvParseError(event.data.code));
			}
		};
		worker.onerror = () => {
			if (settled) return;
			settled = true;
			finish();
			reject(new CsvParseError('background_parsing_failed'));
		};

		const request: WorkerRequest = { buffer, unknownModel };
		worker.postMessage(request, [buffer]);
	});
}

/**
 * Parses CSV records with the same quoting rules as before, but quoted fields are
 * scanned with `indexOf` and unquoted fields are copied with `slice`. Concatenating
 * one character at a time was the dominant cost on Cursor usage exports, which quote
 * every cell.
 *
 * Visits one record at a time so unused columns can be GC'd before the next row.
 */
function forEachRecord(text: string, visit: (record: string[]) => void): void {
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
		if (record.some((value) => value.trim() !== '')) visit(record);
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
}
