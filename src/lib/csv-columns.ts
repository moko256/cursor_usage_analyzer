export const CSV_COLUMNS = {
	date: { aliases: ['date'], required: true },
	cost: { aliases: ['cost'], required: true },
	model: { aliases: ['model'], required: true },
	tokens: { aliases: ['tokens', 'token', 'totaltokens'] },
	inputTokens: { aliases: ['inputtokens', 'inputtoken'] },
	outputTokens: { aliases: ['outputtokens', 'outputtoken'] },
	inputWithCacheWrite: { aliases: ['inputwcachewrite'] },
	inputWithoutCacheWrite: { aliases: ['inputwocachewrite'] },
	cacheRead: { aliases: ['cacheread'] }
} as const;

export type CsvColumnId = keyof typeof CSV_COLUMNS;
export type CsvColumnIndex = Partial<Record<CsvColumnId, number>>;
export type CsvColumnValues = Partial<Record<CsvColumnId, string>>;

export const CSV_COLUMN_IDS = Object.keys(CSV_COLUMNS) as CsvColumnId[];

export function normalizeCsvHeader(value: string) {
	return value
		.replace(/^\uFEFF/, '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

export function resolveCsvColumnIndex(headers: readonly string[]): CsvColumnIndex {
	const normalized = headers.map((header) => normalizeCsvHeader(header));
	const index: CsvColumnIndex = {};

	for (const id of CSV_COLUMN_IDS) {
		const found = findHeaderIndex(normalized, CSV_COLUMNS[id].aliases);
		if (found !== -1) index[id] = found;
	}

	return index;
}

export function hasRequiredCsvColumns(index: CsvColumnIndex) {
	return CSV_COLUMN_IDS.every((id) => !('required' in CSV_COLUMNS[id]) || index[id] !== undefined);
}

/**
 * Copies only declared columns. Unused CSV fields stay out of the Record.
 */
export function pickUsedCsvColumns(
	record: readonly string[],
	index: CsvColumnIndex,
	copy: (value: string) => string = (value) => value
): CsvColumnValues {
	const row: CsvColumnValues = {};

	for (const id of CSV_COLUMN_IDS) {
		const field = index[id];
		if (field === undefined) continue;
		row[id] = copy(record[field] ?? '');
	}

	return row;
}

function findHeaderIndex(headers: readonly string[], names: readonly string[]) {
	for (const name of names) {
		const found = headers.indexOf(name);
		if (found !== -1) return found;
	}
	return -1;
}
