import { describe, expect, it } from 'vitest';
import type { CsvPoint } from '$lib/csv-parser';
import { buildTokenCalendar, groupByDay, sumCost } from './chart-utils';

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

describe('groupByDay', () => {
	it('aggregates tokens and costs independently by UTC day and model', () => {
		const points: CsvPoint[] = [
			{ date: '2026-08-28T23:30:00.000Z', model: 'alpha', cost: 1.25, tokens: 100, kind: 'amount' },
			{ date: '2026-08-28T23:45:00.000Z', model: 'beta', cost: 0.5, tokens: 50, kind: 'amount' },
			{ date: '2026-08-29T00:15:00.000Z', model: 'alpha', cost: null, tokens: 25, kind: 'included' }
		];

		expect(groupByDay(points)).toEqual([
			{
				day: '2026-08-28',
				cost: 1.75,
				tokens: 150,
				models: [
					{ model: 'alpha', cost: 1.25, tokens: 100 },
					{ model: 'beta', cost: 0.5, tokens: 50 }
				]
			},
			{
				day: '2026-08-29',
				cost: 0,
				tokens: 25,
				models: [{ model: 'alpha', cost: 0, tokens: 25 }]
			}
		]);
	});
});

describe('buildTokenCalendar', () => {
	it('pads the daily token data to complete Sunday-based weeks', () => {
		const days = groupByDay([
			{ date: '2026-08-25T10:00:00.000Z', model: 'alpha', cost: 1, tokens: 100, kind: 'amount' },
			{ date: '2026-08-27T10:00:00.000Z', model: 'alpha', cost: 1, tokens: 300, kind: 'amount' }
		]);

		const calendar = buildTokenCalendar(days);

		expect(calendar.range.start).toEqual(new Date(2025, 11, 28));
		expect(calendar.range.end).toEqual(new Date(2027, 0, 3));
		expect(calendar.data).toHaveLength(371);
		expect(calendar.data.find(({ day }) => day === '2026-08-25')?.tokens).toBe(100);
		expect(calendar.data.find(({ day }) => day === '2026-08-26')?.tokens).toBe(0);
		expect(calendar.data.find(({ day }) => day === '2026-08-27')?.tokens).toBe(300);
	});
});
