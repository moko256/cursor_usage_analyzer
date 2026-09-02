import { describe, expect, it } from 'vitest';
import type { CsvPoint } from '$lib/csv-parser';
import {
	buildModelBreakdownSeries,
	buildTokenCalendar,
	filterPointsByDays,
	formatChartAxis,
	formatChartValue,
	formatCostAxis,
	formatTokenAxis,
	groupByDay,
	groupByHour,
	modelsFromDays,
	sumCost,
	sumTokens,
	TOKEN_BREAKDOWN_KEYS,
	TOKEN_BREAKDOWN_LABELS,
	type DailyValue,
	type ModelBreakdownValue
} from './chart-utils';

const noBreakdown = {
	inputWithCacheWrite: 0,
	inputWithoutCacheWrite: 0,
	cacheRead: 0,
	outputTokens: 0
};

describe('sumCost', () => {
	it('sums numeric costs and treats null as 0', () => {
		const points: CsvPoint[] = [
			{
				date: '2026-08-28T17:00:00.000Z',
				model: 'alpha',
				cost: 10.05,
				tokens: 1,
				kind: 'amount',
				...noBreakdown
			},
			{
				date: '2026-08-28T18:00:00.000Z',
				model: 'alpha',
				cost: 2.25,
				tokens: 1,
				kind: 'amount',
				...noBreakdown
			},
			{
				date: '2026-08-28T19:00:00.000Z',
				model: 'alpha',
				cost: null,
				tokens: 1,
				kind: 'included',
				...noBreakdown
			},
			{
				date: '2026-08-28T20:00:00.000Z',
				model: 'alpha',
				cost: null,
				tokens: 1,
				kind: 'free',
				...noBreakdown
			},
			{
				date: '2026-08-28T21:00:00.000Z',
				model: 'alpha',
				cost: null,
				tokens: 1,
				kind: 'empty',
				...noBreakdown
			}
		];

		expect(sumCost(points)).toBe(12.3);
	});
});

describe('sumTokens', () => {
	it('sums tokens across all points', () => {
		const points: CsvPoint[] = [
			{
				date: '2026-08-28T17:00:00.000Z',
				model: 'alpha',
				cost: 1,
				tokens: 100,
				kind: 'amount',
				...noBreakdown
			},
			{
				date: '2026-08-28T18:00:00.000Z',
				model: 'alpha',
				cost: null,
				tokens: 250,
				kind: 'included',
				...noBreakdown
			}
		];

		expect(sumTokens(points)).toBe(350);
	});
});

describe('formatTokenAxis', () => {
	it.each([
		[0, '0'],
		[999, '999'],
		[1_000, '1k'],
		[1_500, '1.5k'],
		[999_500, '999.5k'],
		[999_950, '1M'],
		[1_234_567, '1.2M'],
		[-999, '-999'],
		[-1_500, '-1.5k'],
		[1e9, '1G']
	])('formats %s as %s', (value, expected) => {
		expect(formatTokenAxis(value)).toBe(expected);
	});
});

describe('formatCostAxis', () => {
	it.each([
		[0, '$0'],
		[1_500, '$1.5k'],
		[-1_500, '-$1.5k'],
		[1e9, '$1G']
	])('formats %s as %s', (value, expected) => {
		expect(formatCostAxis(value)).toBe(expected);
	});
});

describe('formatChartAxis', () => {
	it('delegates to the token or cost axis formatter', () => {
		expect(formatChartAxis(1_500, 'tokens')).toBe('1.5k');
		expect(formatChartAxis(1_500, 'cost')).toBe('$1.5k');
	});
});

describe('formatChartValue', () => {
	it('formats compact tokens and USD costs', () => {
		expect(formatChartValue(1234, 'tokens')).toBe('1.2K');
		expect(formatChartValue(1.5, 'cost')).toBe('$1.50');
	});
});

describe('modelsFromDays', () => {
	it('returns unique model names sorted by locale', () => {
		const days: DailyValue[] = [
			{
				day: '2026-08-28',
				cost: 1,
				tokens: 10,
				models: [
					{ model: 'zeta', cost: 1, tokens: 4 },
					{ model: 'alpha', cost: 0, tokens: 6 }
				]
			},
			{
				day: '2026-08-29',
				cost: 2,
				tokens: 5,
				models: [{ model: 'alpha', cost: 2, tokens: 5 }]
			}
		];

		expect(modelsFromDays(days)).toEqual(['alpha', 'zeta']);
	});
});

describe('buildModelBreakdownSeries', () => {
	const row = (overrides: Partial<ModelBreakdownValue> = {}): ModelBreakdownValue => ({
		model: 'alpha',
		cost: 10,
		tokens: 100,
		inputWithCacheWrite: 40,
		inputWithoutCacheWrite: 20,
		cacheRead: 30,
		outputTokens: 10,
		errorMinus: 0,
		errorPlus: 0,
		...overrides
	});

	it('uses stable keys and display labels for the token breakdown', () => {
		const series = buildModelBreakdownSeries([row()], 'tokens', false);

		expect(series.map((item) => item.key)).toEqual([...TOKEN_BREAKDOWN_KEYS]);
		expect(series.map((item) => item.label)).toEqual(
			TOKEN_BREAKDOWN_KEYS.map((key) => TOKEN_BREAKDOWN_LABELS[key])
		);
		expect(series[0]?.value(row())).toBe(40);
	});

	it('adds error series with stable keys and a negative Error+ value', () => {
		const withErrors = row({ tokens: 80, errorMinus: 20, errorPlus: 10, outputTokens: 0 });
		const tokenSeries = buildModelBreakdownSeries([withErrors], 'tokens', false);
		const costSeries = buildModelBreakdownSeries([withErrors], 'cost', false);

		expect(tokenSeries.map((item) => item.key)).toEqual([
			...TOKEN_BREAKDOWN_KEYS,
			'errorMinus',
			'errorPlus'
		]);
		expect(tokenSeries.at(-1)?.value(withErrors)).toBe(-10);
		expect(costSeries.at(-1)?.value(withErrors)).toBe(-1.25);
		expect(tokenSeries.at(-2)?.key).toBe('errorMinus');
		expect(tokenSeries.at(-1)?.key).toBe('errorPlus');
	});
});

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

describe('groupByHour', () => {
	it('aggregates every date into 24 local hour-of-day buckets', () => {
		const points: CsvPoint[] = [
			{
				date: '2026-08-28T00:05:00.000Z',
				model: 'alpha',
				cost: 1,
				tokens: 10,
				kind: 'amount',
				...noBreakdown
			},
			{
				date: '2026-08-28T01:00:00.000Z',
				model: 'alpha',
				cost: 1,
				tokens: 100,
				kind: 'amount',
				...noBreakdown
			},
			{
				date: '2026-08-28T01:59:59.999Z',
				model: 'alpha',
				cost: 1,
				tokens: 50,
				kind: 'amount',
				...noBreakdown
			},
			{
				date: '2026-08-28T02:00:00.000Z',
				model: 'alpha',
				cost: 1,
				tokens: 20,
				kind: 'amount',
				...noBreakdown
			},
			{
				date: '2026-08-28T10:30:00+09:00',
				model: 'alpha',
				cost: 1,
				tokens: 25,
				kind: 'amount',
				...noBreakdown
			},
			{
				date: '2026-08-28T23:59:59.999Z',
				model: 'alpha',
				cost: 1,
				tokens: 30,
				kind: 'amount',
				...noBreakdown
			},
			{
				date: '2026-08-29T00:00:00.000Z',
				model: 'alpha',
				cost: 1,
				tokens: 40,
				kind: 'amount',
				...noBreakdown
			},
			{
				date: '2026-08-30T01:30:00.000Z',
				model: 'alpha',
				cost: 1,
				tokens: 60,
				kind: 'amount',
				...noBreakdown
			}
		];

		const hours = groupByHour(points);
		const expectedTokensByHour = new Map<number, number>();
		for (const point of points) {
			const hour = new Date(point.date).getHours();
			expectedTokensByHour.set(hour, (expectedTokensByHour.get(hour) ?? 0) + point.tokens);
		}

		expect(hours).toHaveLength(24);
		expect(hours.map((hour) => hour.hour)).toEqual(Array.from({ length: 24 }, (_, hour) => hour));
		expect(hours).toEqual(
			Array.from({ length: 24 }, (_, hour) => ({
				hour,
				tokens: expectedTokensByHour.get(hour) ?? 0
			}))
		);
		expect(hours.reduce((sum, hour) => sum + hour.tokens, 0)).toBe(335);
	});

	it('returns zero-valued buckets when there are no points', () => {
		const hours = groupByHour([]);

		expect(hours).toHaveLength(24);
		expect(hours.every((hour) => hour.tokens === 0)).toBe(true);
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

describe('filterPointsByDays', () => {
	const points: CsvPoint[] = [
		point('2026-07-19T12:00:00.000Z', 400, 4),
		point('2026-08-18T12:00:00.000Z', 300, 3),
		point('2026-08-25T12:00:00.000Z', 200, 2),
		point('2026-08-28T12:00:00.000Z', 100, 1)
	];

	it('keeps the inclusive UTC window ending on the latest point', () => {
		expect(filterPointsByDays(points, 1).map((item) => item.date)).toEqual([
			'2026-08-28T12:00:00.000Z'
		]);
		expect(filterPointsByDays(points, 7).map((item) => item.date)).toEqual([
			'2026-08-25T12:00:00.000Z',
			'2026-08-28T12:00:00.000Z'
		]);
		expect(filterPointsByDays(points, 30).map((item) => item.date)).toEqual([
			'2026-08-18T12:00:00.000Z',
			'2026-08-25T12:00:00.000Z',
			'2026-08-28T12:00:00.000Z'
		]);
		expect(filterPointsByDays(points, 'all').map((item) => item.date)).toEqual([
			'2026-07-19T12:00:00.000Z',
			'2026-08-18T12:00:00.000Z',
			'2026-08-25T12:00:00.000Z',
			'2026-08-28T12:00:00.000Z'
		]);
	});

	it('uses the provided now as the window end', () => {
		expect(
			filterPointsByDays(points, 7, new Date('2026-08-25T23:59:59.000Z')).map((item) => item.date)
		).toEqual(['2026-08-25T12:00:00.000Z']);
	});

	it('returns an empty list when there are no points', () => {
		expect(filterPointsByDays([], 30)).toEqual([]);
		expect(filterPointsByDays([], 'all')).toEqual([]);
	});
});

function point(date: string, tokens: number, cost: number): CsvPoint {
	return {
		date,
		model: 'alpha',
		cost,
		tokens,
		kind: 'amount',
		...noBreakdown
	};
}
