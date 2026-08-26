import { describe, expect, it } from 'vitest';
import { parseCsvText } from './csv-parser';

describe('parseCsvText', () => {
	it('extracts and sorts Date and Cost values', () => {
		const points = parseCsvText(
			[
				'Date,Cost,Ignored',
				'2025-02-02T10:00:00Z,2.5,discarded',
				'2025-02-01T10:00:00Z,Free,discarded',
				'2025-02-03T10:00:00Z,,discarded'
			].join('\n')
		);

		expect(points).toEqual([
			{ date: '2025-02-01T10:00:00Z', cost: null, kind: 'free' },
			{ date: '2025-02-02T10:00:00Z', cost: 2.5, kind: 'amount' },
			{ date: '2025-02-03T10:00:00Z', cost: null, kind: 'empty' }
		]);
	});

	it('supports quoted commas, escaped quotes, and a BOM', () => {
		const points = parseCsvText(
			'\uFEFFDate,Cost,Note\r\n"2025-03-01T10:00:00Z","10","say ""hello, world"""\r\n'
		);

		expect(points).toEqual([{ date: '2025-03-01T10:00:00Z', cost: 10, kind: 'amount' }]);
	});

	it('ignores rows with invalid dates or costs', () => {
		const points = parseCsvText(
			[
				'Date,Cost',
				'not-a-date,5',
				'2025-04-01T10:00:00Z,not-a-number',
				'2025-04-02T10:00:00Z,Free'
			].join('\n')
		);

		expect(points).toEqual([{ date: '2025-04-02T10:00:00Z', cost: null, kind: 'free' }]);
	});

	it('requires Date and Cost headers', () => {
		expect(() => parseCsvText('Timestamp,Amount\n2025-01-01T00:00:00Z,1')).toThrow(
			'CSVにDate列とCost列が必要です。'
		);
	});
});
