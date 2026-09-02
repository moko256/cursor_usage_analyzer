import * as m from '$lib/paraglide/messages';
import { CsvParseError } from './csv-parser';

export function csvParseErrorMessage(error: unknown): string {
	if (!(error instanceof CsvParseError)) {
		console.error(error);

		return m.csv_read_failed();
	}

	switch (error.code) {
		case 'empty':
			return m.csv_empty();
		case 'missing_columns':
			return m.csv_missing_columns();
		case 'no_valid_data':
			return m.csv_no_valid_data();
		case 'background_parsing_unavailable':
			return m.background_parsing_unavailable();
		case 'background_parsing_failed':
			return m.background_parsing_failed();
		case 'unclosed_quotes':
			return m.csv_unclosed_quotes();
		default:
			return m.csv_parse_failed();
	}
}
