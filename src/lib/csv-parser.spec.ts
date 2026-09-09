import { describe, expect, it } from 'vitest';
import { csvPoint } from './csv-point.fixture';
import { createThrottledCsvProgress, parseCsvText, type CsvParseProgress } from './csv-parser';

const newCsvHeader =
	'Date,Cloud Agent ID,Automation ID,Kind,Model,Max Mode,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost';

const usedCsvHeader =
	'Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost';

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

	it('rejects CSVs that omit a required column', () => {
		expect(() => parseCsvText('Date,Cost,Model\n2026-08-28T17:00:00.000Z,1.5,alpha')).toThrow(
			'missing_columns'
		);
		expect(() =>
			parseCsvText('Date,Cost,Model,Input Tokens,Output Tokens\n2026-05-01T10:00:00Z,1,alpha,12,8')
		).toThrow('missing_columns');
	});

	it('supports quoted commas, escaped quotes, and a BOM', () => {
		const points = parseCsvText(
			`\uFEFF${usedCsvHeader},Note\r\n"2026-03-01T10:00:00Z","alpha","0","0","0","0","42","10","say ""hello, world"""\r\n`
		);

		expect(points).toEqual([csvPoint({ date: '2026-03-01T10:00:00Z', cost: 10, tokens: 42 })]);
	});

	it('ignores rows with invalid dates or costs', () => {
		const points = parseCsvText(
			[
				usedCsvHeader,
				'not-a-date,alpha,0,0,0,0,10,5',
				'2026-04-01T10:00:00Z,alpha,0,0,0,0,10,not-a-number',
				'2026-04-02T10:00:00Z,alpha,0,0,0,0,10,Free',
				'2026-04-03T10:00:00Z,alpha,0,0,0,0,10,-'
			].join('\n')
		);

		expect(points).toEqual([
			csvPoint({ date: '2026-04-02T10:00:00Z', cost: null, tokens: 10 }),
			csvPoint({ date: '2026-04-03T10:00:00Z', cost: null, tokens: 10 })
		]);
	});

	it('requires every declared column header', () => {
		expect(() => parseCsvText('Timestamp,Amount,Model\n2026-01-01T00:00:00Z,1,alpha')).toThrow(
			'missing_columns'
		);
	});

	it('does not keep unused CSV columns on parsed points', () => {
		const points = parseCsvText(
			[
				'Date,Cloud Agent ID,__proto__,User,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost',
				'"2026-08-28T17:00:00.000Z","bc-secret","pollute","ada",alpha,0,0,0,0,0,1.5'
			].join('\n')
		);

		expect(points).toEqual([
			csvPoint({ date: '2026-08-28T17:00:00.000Z', cost: 1.5, model: 'alpha' })
		]);
		expect(points[0]).not.toHaveProperty('Cloud Agent ID');
		expect(points[0]).not.toHaveProperty('__proto__');
		expect(points[0]).not.toHaveProperty('User');
	});

	it('keeps quoted field content when quotes appear inside an unquoted value', () => {
		const points = parseCsvText(`${usedCsvHeader}\n2026-08-28T17:00:00.000Z,"al"pha,0,0,0,0,0,1.5`);

		expect(points[0]?.model).toBe('alpha');
	});

	it('parses a trailing comma without dropping the row', () => {
		const points = parseCsvText(
			`${usedCsvHeader},\n2026-08-28T17:00:00.000Z,alpha,0,0,0,0,0,1.5,\n`
		);

		expect(points).toHaveLength(1);
		expect(points[0]).toMatchObject({
			date: '2026-08-28T17:00:00.000Z',
			model: 'alpha',
			cost: 1.5
		});
	});

	it('throws when a quoted field is left open', () => {
		expect(() =>
			parseCsvText(`${usedCsvHeader}\n"2026-08-28T17:00:00.000Z,alpha,0,0,0,0,0,1.5`)
		).toThrow('unclosed_quotes');
	});

	it('throws when the file has no records', () => {
		expect(() => parseCsvText('')).toThrow('empty');
		expect(() => parseCsvText('\n\n')).toThrow('empty');
	});

	it('reports scan progress as monotonic processedChars', () => {
		const text = [
			usedCsvHeader,
			'2026-04-02T10:00:00Z,alpha,0,0,0,0,10,1',
			'2026-04-03T10:00:00Z,alpha,0,0,0,0,10,2'
		].join('\n');
		const reports: CsvParseProgress[] = [];

		parseCsvText(text, (progress) => reports.push(progress));

		expect(reports.length).toBeGreaterThan(0);
		expect(reports[0]?.processedChars).toBeGreaterThan(0);
		for (let index = 1; index < reports.length; index += 1) {
			expect(reports[index].processedChars).toBeGreaterThanOrEqual(
				reports[index - 1].processedChars
			);
			expect(reports[index].totalChars).toBe(text.length);
		}
		expect(reports.at(-1)).toEqual({ processedChars: text.length, totalChars: text.length });
	});
});

describe('createThrottledCsvProgress', () => {
	it('posts at the interval and skips 100%', () => {
		let now = 0;
		const posted: CsvParseProgress[] = [];
		const post = createThrottledCsvProgress(
			(progress) => posted.push(progress),
			15,
			() => now
		);

		post({ processedChars: 1, totalChars: 10 });
		now = 10;
		post({ processedChars: 2, totalChars: 10 });
		now = 15;
		post({ processedChars: 3, totalChars: 10 });
		post({ processedChars: 10, totalChars: 10 });

		expect(posted).toEqual([
			{ processedChars: 1, totalChars: 10 },
			{ processedChars: 3, totalChars: 10 }
		]);
	});
});
