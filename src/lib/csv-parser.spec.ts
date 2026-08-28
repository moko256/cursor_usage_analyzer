import { describe, expect, it } from 'vitest';
import { parseCsvText } from './csv-parser';

describe('parseCsvText', () => {
	it('extracts and sorts Date and Cost values', () => {
		const points = parseCsvText(
			[
				'Date,Cost,Model,Tokens,Ignored',
				'2025-02-02T10:00:00Z,2.5,alpha,100,discarded',
				'2025-02-01T10:00:00Z,Free,beta,200,discarded',
				'2025-02-03T10:00:00Z,,alpha,300,discarded'
			].join('\n')
		);

		expect(points).toEqual([
			{ date: '2025-02-01T10:00:00Z', model: 'beta', cost: null, tokens: 200, kind: 'free' },
			{ date: '2025-02-02T10:00:00Z', model: 'alpha', cost: 2.5, tokens: 100, kind: 'amount' },
			{ date: '2025-02-03T10:00:00Z', model: 'alpha', cost: null, tokens: 300, kind: 'empty' }
		]);
	});

	it('supports quoted commas, escaped quotes, and a BOM', () => {
		const points = parseCsvText(
			'\uFEFFDate,Cost,Model,Note\r\n"2025-03-01T10:00:00Z","10","alpha","say ""hello, world"""\r\n'
		);

		expect(points).toEqual([
			{ date: '2025-03-01T10:00:00Z', model: 'alpha', cost: 10, tokens: 0, kind: 'amount' }
		]);
	});

	it('ignores rows with invalid dates or costs', () => {
		const points = parseCsvText(
			[
				'Date,Cost,Model',
				'not-a-date,5',
				'2025-04-01T10:00:00Z,not-a-number,alpha',
				'2025-04-02T10:00:00Z,Free,alpha'
			].join('\n')
		);

		expect(points).toEqual([
			{ date: '2025-04-02T10:00:00Z', model: 'alpha', cost: null, tokens: 0, kind: 'free' }
		]);
	});

	it('requires Date and Cost headers', () => {
		expect(() => parseCsvText('Timestamp,Amount,Model\n2025-01-01T00:00:00Z,1,alpha')).toThrow(
			'missing_columns'
		);
	});

	it('sums input and output tokens when total tokens are not provided', () => {
		const points = parseCsvText(
			'Date,Cost,Model,Input Tokens,Output Tokens\n2025-05-01T10:00:00Z,1,alpha,12,8'
		);

		expect(points[0]?.tokens).toBe(20);
	});
});
