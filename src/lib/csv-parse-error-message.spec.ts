import { afterEach, describe, expect, it, vi } from 'vitest';
import * as m from '$lib/paraglide/messages';
import { csvParseErrorMessage } from './csv-parse-error-message';
import { CsvParseError, type CsvParseErrorCode } from './csv-parser';

const messagesByCode: Record<CsvParseErrorCode, () => string> = {
	empty: m.csv_empty,
	missing_columns: m.csv_missing_columns,
	no_valid_data: m.csv_no_valid_data,
	background_parsing_unavailable: m.background_parsing_unavailable,
	background_parsing_failed: m.background_parsing_failed,
	unclosed_quotes: m.csv_unclosed_quotes,
	parse_failed: m.csv_parse_failed
};

describe('csvParseErrorMessage', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each(Object.entries(messagesByCode))('maps %s to its catalog message', (code, message) => {
		expect(csvParseErrorMessage(new CsvParseError(code as CsvParseErrorCode))).toBe(message());
	});

	it('logs unexpected errors and returns the generic read failure', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const error = new Error('boom');

		expect(csvParseErrorMessage(error)).toBe(m.csv_read_failed());
		expect(spy).toHaveBeenCalledWith(error);
	});
});
