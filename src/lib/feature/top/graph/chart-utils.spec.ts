import { describe, expect, it } from 'vitest';
import type { CsvPoint } from '$lib/csv-parser';
import { sumCost } from './chart-utils';

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
