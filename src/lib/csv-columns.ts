export const CSV_COLUMNS = {
	date: { aliases: ['date'] },
	cost: { aliases: ['cost'] },
	model: { aliases: ['model'] },
	tokens: { aliases: ['tokens', 'token', 'totaltokens'] },
	outputTokens: { aliases: ['outputtokens', 'outputtoken'] },
	inputWithCacheWrite: { aliases: ['inputwcachewrite'] },
	inputWithoutCacheWrite: { aliases: ['inputwocachewrite'] },
	cacheRead: { aliases: ['cacheread'] }
} as const;

export type CsvColumnId = keyof typeof CSV_COLUMNS;
export type CsvColumnIndex = Record<CsvColumnId, number>;
export type CsvColumnValues = Record<CsvColumnId, string>;

export const CSV_COLUMN_IDS = Object.keys(CSV_COLUMNS) as CsvColumnId[];

export function normalizeCsvHeader(value: string) {
	return value
		.replace(/^\uFEFF/, '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

export function resolveCsvColumnIndex(headers: readonly string[]): CsvColumnIndex | null {
	const normalized = headers.map((header) => normalizeCsvHeader(header));
	const index = {} as CsvColumnIndex;

	for (const id of CSV_COLUMN_IDS) {
		const found = findHeaderIndex(normalized, CSV_COLUMNS[id].aliases);
		if (found === -1) return null;
		index[id] = found;
	}

	return index;
}

/**
 * Copies only declared columns. Unused CSV fields stay out of the Record.
 */
export function pickUsedCsvColumns(
	record: readonly string[],
	index: CsvColumnIndex,
	copy: (value: string) => string = (value) => value
): CsvColumnValues {
	const row = {} as CsvColumnValues;

	for (const id of CSV_COLUMN_IDS) {
		row[id] = copy(record[index[id]] ?? '');
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
