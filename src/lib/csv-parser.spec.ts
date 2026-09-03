import { describe, expect, it } from 'vitest';
import { csvPoint } from './csv-point.fixture';
import { parseCsvText } from './csv-parser';

const newCsvHeader =
	'Date,Cloud Agent ID,Automation ID,Kind,Model,Max Mode,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost';

describe('parseCsvText', () => {
	it('extracts Total Tokens and Cost from the Cursor usage CSV', () => {
		const points = parseCsvText(
			[
				newCsvHeader,
				'"2026-08-28T17:49:12.795Z","bc-801453d9-84f9-4980-b9ca-39bb13165988","","Included","gpt-5.6-luna-high","No","120957","611","1452080","15625","1589273","Included"',
				'"2026-08-28T17:48:02.229Z","","","Included","cursor-grok-4.6-high","No","","","","","","Free"',
				'"2026-08-28T17:41:46.434Z","bc-53b5b9a6-1c88-4cca-b5bd-5b9121229264","","Included","gpt-5.6-luna-high","No","231243","639","4130263","27839","4389984","Included"',
				'"2026-08-28T17:41:33.344Z","","","Included","cursor-grok-4.6-high","No","","","","","","Free"',
				'"2026-08-28T16:38:08.403Z","","","Included","gpt-5.6-luna-high","No","81777","114","2278964","18640","2379495","Included"',
				'"2026-08-28T16:00:00.000Z","","","Included","gpt-5.6-luna-high","No","1","2","3","4","100","12.34"',
				'"2026-08-28T15:00:00.000Z","","","Included","gpt-5.6-luna-high","No","1","2","3","4","50",""'
			].join('\n')
		);

		expect(points).toEqual([
			csvPoint({
				date: '2026-08-28T15:00:00.000Z',
				model: 'gpt-5.6-luna-high',
				cost: null,
				tokens: 50,
				inputWithCacheWrite: 1,
				inputWithoutCacheWrite: 2,
				cacheRead: 3,
				outputTokens: 4
			}),
			csvPoint({
				date: '2026-08-28T16:00:00.000Z',
				model: 'gpt-5.6-luna-high',
				cost: 12.34,
				tokens: 100,
				inputWithCacheWrite: 1,
				inputWithoutCacheWrite: 2,
				cacheRead: 3,
				outputTokens: 4
			}),
			csvPoint({
				date: '2026-08-28T16:38:08.403Z',
				model: 'gpt-5.6-luna-high',
				cost: null,
				tokens: 2379495,
				inputWithCacheWrite: 81777,
				inputWithoutCacheWrite: 114,
				cacheRead: 2278964,
				outputTokens: 18640
			}),
			csvPoint({
				date: '2026-08-28T17:41:33.344Z',
				model: 'cursor-grok-4.6-high',
				cost: null
			}),
			csvPoint({
				date: '2026-08-28T17:41:46.434Z',
				model: 'gpt-5.6-luna-high',
				cost: null,
				tokens: 4389984,
				inputWithCacheWrite: 231243,
				inputWithoutCacheWrite: 639,
				cacheRead: 4130263,
				outputTokens: 27839
			}),
			csvPoint({
				date: '2026-08-28T17:48:02.229Z',
				model: 'cursor-grok-4.6-high',
				cost: null
			}),
			csvPoint({
				date: '2026-08-28T17:49:12.795Z',
				model: 'gpt-5.6-luna-high',
				cost: null,
				tokens: 1589273,
				inputWithCacheWrite: 120957,
				inputWithoutCacheWrite: 611,
				cacheRead: 1452080,
				outputTokens: 15625
			})
		]);
	});

	it('does not sum Input and Output Tokens when Total Tokens is present', () => {
		const points = parseCsvText(
			[
				newCsvHeader,
				'"2026-08-28T17:00:00.000Z","","","Included","alpha","No","12","0","0","8","3","Included"'
			].join('\n')
		);

		expect(points[0]?.tokens).toBe(3);
		expect(points[0]).toMatchObject({
			inputWithCacheWrite: 12,
			inputWithoutCacheWrite: 0,
			cacheRead: 0,
			outputTokens: 8
		});
	});

	it('uses 0 tokens when Total Tokens is missing', () => {
		const points = parseCsvText('Date,Cost,Model\n2026-08-28T17:00:00.000Z,1.5,alpha');

		expect(points).toEqual([csvPoint({ date: '2026-08-28T17:00:00.000Z', cost: 1.5 })]);
	});

	it('supports quoted commas, escaped quotes, and a BOM', () => {
		const points = parseCsvText(
			'\uFEFFDate,Cost,Model,Total Tokens,Note\r\n"2026-03-01T10:00:00Z","10","alpha","42","say ""hello, world"""\r\n'
		);

		expect(points).toEqual([csvPoint({ date: '2026-03-01T10:00:00Z', cost: 10, tokens: 42 })]);
	});

	it('ignores rows with invalid dates or costs', () => {
		const points = parseCsvText(
			[
				'Date,Cost,Model,Total Tokens',
				'not-a-date,5,alpha,10',
				'2026-04-01T10:00:00Z,not-a-number,alpha,10',
				'2026-04-02T10:00:00Z,Free,alpha,10',
				'2026-04-03T10:00:00Z,-,alpha,10'
			].join('\n')
		);

		expect(points).toEqual([
			csvPoint({ date: '2026-04-02T10:00:00Z', cost: null, tokens: 10 }),
			csvPoint({ date: '2026-04-03T10:00:00Z', cost: null, tokens: 10 })
		]);
	});

	it('requires Date and Cost headers', () => {
		expect(() => parseCsvText('Timestamp,Amount,Model\n2026-01-01T00:00:00Z,1,alpha')).toThrow(
			'missing_columns'
		);
	});

	it('sums input and output tokens when total tokens are not provided', () => {
		const points = parseCsvText(
			'Date,Cost,Model,Input Tokens,Output Tokens\n2026-05-01T10:00:00Z,1,alpha,12,8'
		);

		expect(points[0]).toMatchObject({
			tokens: 20,
			inputWithCacheWrite: 0,
			inputWithoutCacheWrite: 0,
			cacheRead: 0,
			outputTokens: 8
		});
	});

	it('keeps quoted field content when quotes appear inside an unquoted value', () => {
		const points = parseCsvText('Date,Cost,Model\n2026-08-28T17:00:00.000Z,1.5,"al"pha');

		expect(points[0]?.model).toBe('alpha');
	});

	it('parses a trailing comma without dropping the row', () => {
		const points = parseCsvText('Date,Cost,Model,\n2026-08-28T17:00:00.000Z,1.5,alpha,\n');

		expect(points).toHaveLength(1);
		expect(points[0]).toMatchObject({
			date: '2026-08-28T17:00:00.000Z',
			model: 'alpha',
			cost: 1.5
		});
	});

	it('throws when a quoted field is left open', () => {
		expect(() => parseCsvText('Date,Cost,Model\n"2026-08-28T17:00:00.000Z,1.5,alpha')).toThrow(
			'unclosed_quotes'
		);
	});

	it('throws when the file has no records', () => {
		expect(() => parseCsvText('')).toThrow('empty');
		expect(() => parseCsvText('\n\n')).toThrow('empty');
	});
});
