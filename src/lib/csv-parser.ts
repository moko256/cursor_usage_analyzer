import CsvParserWorker from '$lib/csv-parser.worker?worker&inline';
import type { DashboardData } from '$lib/feature/top/graph/chart-types';
import {
	pickUsedCsvColumns,
	resolveCsvColumnIndex,
	type CsvColumnIndex,
	type CsvColumnValues
} from './csv-columns';

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

/** Worker posts mid-parse progress at least this often. 100% is unthrottled. */
export const CSV_PARSE_PROGRESS_INTERVAL_MS = 15;

export type WorkerRequest = {
	/** Transferred ArrayBuffer of the CSV bytes; ownership moves to the worker. */
	buffer: ArrayBuffer;
	unknownModel: string;
};

export type CsvParseProgress = {
	processedChars: number;
	totalChars: number;
};

export type WorkerProgress = {
	type: 'progress';
} & CsvParseProgress;

export type WorkerSuccess = {
	type: 'success';
	dashboard: DashboardData;
};

export type WorkerFailure = {
	type: 'error';
	code: CsvParseErrorCode;
};

export type WorkerResponse = WorkerProgress | WorkerSuccess | WorkerFailure;

/**
 * Posts scan progress, skipping 100% and updates that arrive sooner than
 * `intervalMs`. The worker sends 100% once after `parseCsvText` returns.
 */
export function createThrottledCsvProgress(
	post: (progress: CsvParseProgress) => void,
	intervalMs: number = CSV_PARSE_PROGRESS_INTERVAL_MS,
	now: () => number = () => performance.now()
): (progress: CsvParseProgress) => void {
	let lastSentAt = Number.NEGATIVE_INFINITY;
	return (progress) => {
		if (progress.processedChars >= progress.totalChars) return;
		const at = now();
		if (at - lastSentAt < intervalMs) return;
		lastSentAt = at;
		post(progress);
	};
}

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
export function parseCsvText(
	text: string,
	onProgress?: (progress: CsvParseProgress) => void
): CsvPoint[] {
	let columns: CsvColumnIndex | null = null;
	const points: CsvPoint[] = [];
	const timestamps: number[] = [];
	let sawRecord = false;

	forEachRecord(
		text,
		(record) => {
			sawRecord = true;
			if (columns === null) {
				columns = resolveCsvColumnIndex(record);
				if (columns === null) {
					throw new CsvParseError('missing_columns');
				}
				return;
			}

			const row = pickUsedCsvColumns(record, columns, detachString);
			const date = row.date.trim();
			if (!isoDateTimePattern.test(date)) return;
			const timestamp = Date.parse(date);
			if (!Number.isFinite(timestamp)) return;

			const model = row.model.trim();
			const tokens = parseNonNegativeNumber(row.tokens);
			const tokenBreakdown = parseTokenBreakdown(row);
			const parsedCost = parseCost(row.cost);
			if (parsedCost !== null) {
				points.push({ date, model, tokens, ...tokenBreakdown, ...parsedCost });
				timestamps.push(timestamp);
			}
		},
		onProgress
	);

	if (!sawRecord) {
		throw new CsvParseError('empty');
	}

	if (points.length === 0) {
		throw new CsvParseError('no_valid_data');
	}

	return sortPointsByTimestamp(points, timestamps);
}

function sortPointsByTimestamp(points: CsvPoint[], timestamps: number[]): CsvPoint[] {
	const order = timestamps.map((_, index) => index);
	order.sort((left, right) => timestamps[left] - timestamps[right]);
	return order.map((index) => points[index]);
}

function parseCost(value: string): Pick<CsvPoint, 'cost'> | null {
	const rawCost = value.trim();
	if (rawCost === '') return { cost: null };

	const normalized = rawCost.toLowerCase();
	if (normalized === 'free' || normalized === '-' || normalized === 'included') {
		return { cost: null };
	}

	const cost = Number(rawCost);
	return Number.isFinite(cost) ? { cost } : null;
}

function parseNonNegativeNumber(value: string) {
	const number = Number(value.trim());
	return Number.isFinite(number) && number >= 0 ? number : 0;
}

function parseTokenBreakdown(row: CsvColumnValues): TokenBreakdown {
	return {
		inputWithCacheWrite: parseNonNegativeNumber(row.inputWithCacheWrite),
		inputWithoutCacheWrite: parseNonNegativeNumber(row.inputWithoutCacheWrite),
		cacheRead: parseNonNegativeNumber(row.cacheRead),
		outputTokens: parseNonNegativeNumber(row.outputTokens)
	};
}

/**
 * Reads the blob into an ArrayBuffer, then transfers that buffer to a one-shot
 * worker. Uses `.then` (not `async`) so the Blob parameter is not kept alive
 * across the worker wait after the bytes are read. The worker is terminated
 * after it posts back the compact dashboard.
 */
export function parseCsvFile(
	file: Blob,
	unknownModel: string,
	onProgress?: (progress: CsvParseProgress) => void
): Promise<DashboardData> {
	return file.arrayBuffer().then((buffer) => parseCsvArrayBuffer(buffer, unknownModel, onProgress));
}

function parseCsvArrayBuffer(
	buffer: ArrayBuffer,
	unknownModel: string,
	onProgress?: (progress: CsvParseProgress) => void
): Promise<DashboardData> {
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

		worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
			if (event.data.type === 'progress') {
				onProgress?.({
					processedChars: event.data.processedChars,
					totalChars: event.data.totalChars
				});
				return;
			}
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
function forEachRecord(
	text: string,
	visit: (record: string[]) => void,
	onProgress?: (progress: CsvParseProgress) => void
): void {
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
			onProgress?.({ processedChars: index, totalChars: length });
			continue;
		}

		index += 1;
	}

	if (insideQuotes) throw new CsvParseError('unclosed_quotes');
	if (start < length || record.length > 0 || hasChunks) {
		pushRecord(length);
		onProgress?.({ processedChars: length, totalChars: length });
	}
}
