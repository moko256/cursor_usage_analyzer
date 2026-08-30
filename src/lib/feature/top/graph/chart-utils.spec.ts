import { describe, expect, it } from 'vitest';
import type { CsvPoint } from '$lib/csv-parser';
import { formatClipboardData, sumCost } from './chart-utils';

describe('formatClipboardData', () => {
	it('formats chart rows as tab-separated clipboard data', () => {
		expect(
			formatClipboardData(
				['model', 'cost'],
				[
					['alpha', 1.25],
					['beta', 0]
				]
			)
		).toBe('model\tcost\nalpha\t1.25\nbeta\t0');
	});

	it('replaces control characters that would break rows or columns', () => {
		expect(formatClipboardData(['model'], [['alpha\tbeta\n']])).toBe('model\nalpha beta ');
	});
});

describe('sumCost', () => {
	it('sums numeric costs and treats null as 0', () => {
		const points: CsvPoint[] = [
			{ date: '2026-08-28T17:00:00.000Z', model: 'alpha', cost: 10.05, tokens: 1, kind: 'amount' },
			{ date: '2026-08-28T18:00:00.000Z', model: 'alpha', cost: 2.25, tokens: 1, kind: 'amount' },
			{ date: '2026-08-28T19:00:00.000Z', model: 'alpha', cost: null, tokens: 1, kind: 'included' },
			{ date: '2026-08-28T20:00:00.000Z', model: 'alpha', cost: null, tokens: 1, kind: 'free' },
			{ date: '2026-08-28T21:00:00.000Z', model: 'alpha', cost: null, tokens: 1, kind: 'empty' }
		];

		expect(sumCost(points)).toBe(12.3);
	});
});
