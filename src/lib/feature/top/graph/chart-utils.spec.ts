import { describe, expect, it } from 'vitest';
import type { CsvPoint } from '$lib/csv-parser';
import { buildTokenCalendar, groupByDay } from './chart-utils';

const noBreakdown = {
	inputWithCacheWrite: 0,
	inputWithoutCacheWrite: 0,
	cacheRead: 0,
	outputTokens: 0
};

describe('groupByDay', () => {
	it('aggregates tokens and costs independently by UTC day and model', () => {
		const points: CsvPoint[] = [
			{
				date: '2026-08-28T23:30:00.000Z',
				model: 'alpha',
				cost: 1.25,
				tokens: 100,
				kind: 'amount',
				...noBreakdown
			},
			{
				date: '2026-08-28T23:45:00.000Z',
				model: 'beta',
				cost: 0.5,
				tokens: 50,
				kind: 'amount',
				...noBreakdown
			},
			{
				date: '2026-08-29T00:15:00.000Z',
				model: 'alpha',
				cost: null,
				tokens: 25,
				kind: 'included',
				...noBreakdown
			}
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
	it('shows the oldest data month through today when the current month has data', () => {
		const days = groupByDay([
			{
				date: '2026-08-25T10:00:00.000Z',
				model: 'alpha',
				cost: 1,
				tokens: 100,
				kind: 'amount',
				...noBreakdown
			},
			{
				date: '2026-08-27T10:00:00.000Z',
				model: 'alpha',
				cost: 1,
				tokens: 300,
				kind: 'amount',
				...noBreakdown
			}
		]);

		const calendar = buildTokenCalendar(days, new Date(2026, 7, 31, 12));

		expect(calendar.range.start).toEqual(new Date(2026, 7, 1));
		expect(calendar.range.end).toEqual(new Date(2026, 8, 1));
		expect(calendar.data).toHaveLength(31);
		expect(calendar.data[0]?.day).toBe('2026-08-01');
		expect(calendar.data.find(({ day }) => day === '2026-08-25')?.tokens).toBe(100);
		expect(calendar.data.find(({ day }) => day === '2026-08-26')?.tokens).toBe(0);
		expect(calendar.data.find(({ day }) => day === '2026-08-27')?.tokens).toBe(300);
		expect(calendar.data.at(-1)?.day).toBe('2026-08-31');
	});

	it('shows the oldest data month through today when older data also exists', () => {
		const days = groupByDay([
			{
				date: '2026-07-15T10:00:00.000Z',
				model: 'alpha',
				cost: 1,
				tokens: 100,
				kind: 'amount',
				...noBreakdown
			},
			{
				date: '2026-08-02T10:00:00.000Z',
				model: 'alpha',
				cost: 1,
				tokens: 300,
				kind: 'amount',
				...noBreakdown
			}
		]);

		const calendar = buildTokenCalendar(days, new Date(2026, 7, 31, 12));

		expect(calendar.range.start).toEqual(new Date(2026, 6, 1));
		expect(calendar.range.end).toEqual(new Date(2026, 8, 1));
		expect(calendar.data).toHaveLength(62);
		expect(calendar.data[0]?.day).toBe('2026-07-01');
		expect(calendar.data.at(-1)?.day).toBe('2026-08-31');
	});

	it('shows complete data months when the current month has no data', () => {
		const days = groupByDay([
			{
				date: '2026-06-15T10:00:00.000Z',
				model: 'alpha',
				cost: 1,
				tokens: 100,
				kind: 'amount',
				...noBreakdown
			},
			{
				date: '2026-08-27T10:00:00.000Z',
				model: 'alpha',
				cost: 1,
				tokens: 300,
				kind: 'amount',
				...noBreakdown
			}
		]);

		const calendar = buildTokenCalendar(days, new Date(2026, 7, 31, 12));

		expect(calendar.range.start).toEqual(new Date(2026, 5, 1));
		expect(calendar.range.end).toEqual(new Date(2026, 8, 1));
		expect(calendar.data).toHaveLength(92);
		expect(calendar.data[0]?.day).toBe('2026-06-01');
		expect(calendar.data.find(({ day }) => day === '2026-08-31')?.tokens).toBe(0);
		expect(calendar.data.at(-1)?.day).toBe('2026-08-31');
	});

	it('treats a current-month day with zero tokens as current-month data', () => {
		const days = groupByDay([
			{
				date: '2026-08-02T10:00:00.000Z',
				model: 'alpha',
				cost: 1,
				tokens: 0,
				kind: 'amount',
				...noBreakdown
			}
		]);

		const calendar = buildTokenCalendar(days, new Date(2026, 7, 31, 12));

		expect(calendar.range.start).toEqual(new Date(2026, 7, 1));
		expect(calendar.range.end).toEqual(new Date(2026, 8, 1));
	});
});
