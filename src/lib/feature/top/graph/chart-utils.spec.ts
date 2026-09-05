import { describe, expect, it } from 'vitest';
import { csvPoint, modelBreakdown } from '$lib/csv-point.fixture';
import {
	buildDailyModelSeries,
	buildModelBreakdownSeries,
	buildModelIndexTable,
	buildTokenCalendar,
	filterPointsByDays,
	formatChartAxis,
	formatChartValue,
	formatCostAxis,
	formatDay,
	formatTokenAxis,
	getDailyModelColors,
	groupByDay,
	groupByHour,
	isUtcIsoTimestamp,
	modelsFromDays,
	sumCost,
	sumTokens,
	utcDay,
	utcDayAndLocalHour,
	TOKEN_BREAKDOWN_KEYS,
	TOKEN_BREAKDOWN_LABELS
} from './chart-utils';

describe('sumCost', () => {
	it('sums numeric costs and treats null as 0', () => {
		expect(
			sumCost([
				csvPoint({ date: '2026-08-28T17:00:00.000Z', cost: 10.05, tokens: 1 }),
				csvPoint({ date: '2026-08-28T18:00:00.000Z', cost: 2.25, tokens: 1 }),
				csvPoint({ date: '2026-08-28T19:00:00.000Z', cost: null, tokens: 1 }),
				csvPoint({ date: '2026-08-28T20:00:00.000Z', cost: null, tokens: 1 }),
				csvPoint({ date: '2026-08-28T21:00:00.000Z', cost: null, tokens: 1 })
			])
		).toBe(12.3);
	});
});

describe('sumTokens', () => {
	it('sums tokens across all points', () => {
		expect(
			sumTokens([
				csvPoint({ date: '2026-08-28T17:00:00.000Z', tokens: 100 }),
				csvPoint({ date: '2026-08-28T18:00:00.000Z', cost: null, tokens: 250 })
			])
		).toBe(350);
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

describe('formatDay', () => {
	it('formats a UTC calendar day without constructing a new formatter each call', () => {
		expect(formatDay('2026-08-28')).toBe('Aug 28');
		expect(formatDay('2026-01-02')).toBe('Jan 2');
		expect(formatDay('not-a-day')).toBe('not-a-day');
	});
});

describe('utcDay', () => {
	it('reads the calendar day from a UTC ISO timestamp without shifting it', () => {
		expect(isUtcIsoTimestamp('2026-08-28T23:30:00.000Z')).toBe(true);
		expect(utcDay('2026-08-28T23:30:00.000Z')).toBe('2026-08-28');
		expect(utcDay('2026-08-29T00:15:00Z')).toBe('2026-08-29');
	});

	it('converts offset timestamps to the UTC calendar day', () => {
		expect(isUtcIsoTimestamp('2026-08-28T00:30:00+09:00')).toBe(false);
		expect(utcDay('2026-08-28T00:30:00+09:00')).toBe('2026-08-27');
		expect(utcDay('2026-08-28T08:30:00+09:00')).toBe('2026-08-27');
		expect(utcDay('2026-08-28T09:00:00+09:00')).toBe('2026-08-28');
	});

	it('falls back to the first 10 characters when the value is not a date', () => {
		expect(utcDay('not-a-date')).toBe('not-a-date');
	});
});

describe('utcDayAndLocalHour', () => {
	it('returns the UTC day and a local hour for a parseable timestamp', () => {
		const point = utcDayAndLocalHour('2026-08-28T10:30:00+09:00');

		expect(point.day).toBe('2026-08-28');
		expect(point.hour).toBe(new Date('2026-08-28T10:30:00+09:00').getHours());
	});

	it('omits the hour when the timestamp is invalid', () => {
		expect(utcDayAndLocalHour('not-a-date')).toEqual({ day: 'not-a-date', hour: null });
	});
});

describe('modelsFromDays', () => {
	it('returns unique model names sorted by locale', () => {
		expect(
			modelsFromDays([
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
			])
		).toEqual(['alpha', 'zeta']);
	});
});

describe('buildModelIndexTable', () => {
	it('sorts unique model names and numbers them from 0', () => {
		expect(
			buildModelIndexTable([
				csvPoint({ model: 'zeta' }),
				csvPoint({ model: 'alpha' }),
				csvPoint({ model: 'zeta' }),
				csvPoint({ model: 'beta' })
			])
		).toEqual({
			names: ['alpha', 'beta', 'zeta'],
			indexByName: { alpha: 0, beta: 1, zeta: 2 },
			count: 3
		});
	});

	it('uses the unknown-model label for empty names', () => {
		expect(
			buildModelIndexTable([csvPoint({ model: '' }), csvPoint({ model: 'alpha' })], '不明')
		).toEqual({
			names: ['alpha', '不明'],
			indexByName: { alpha: 0, 不明: 1 },
			count: 2
		});
	});
});

describe('buildDailyModelSeries', () => {
	const modelIndices = buildModelIndexTable([
		csvPoint({ model: 'alpha' }),
		csvPoint({ model: 'beta' }),
		csvPoint({ model: 'gamma' })
	]);

	it('assigns colors from the global index table, not the range-local order', () => {
		const allSeries = buildDailyModelSeries(
			['alpha', 'beta', 'gamma'],
			'tokens',
			true,
			modelIndices
		);
		const gammaOnly = buildDailyModelSeries(['gamma'], 'tokens', true, modelIndices);

		expect(modelIndices).toEqual({
			names: ['alpha', 'beta', 'gamma'],
			indexByName: { alpha: 0, beta: 1, gamma: 2 },
			count: 3
		});
		expect(allSeries.map((item) => item.color)).toEqual([
			getDailyModelColors(0, 3, true),
			getDailyModelColors(1, 3, true),
			getDailyModelColors(2, 3, true)
		]);
		expect(gammaOnly[0]?.color).toBe(allSeries[2]?.color);
		expect(gammaOnly[0]?.color).not.toBe(getDailyModelColors(0, 1, true));
	});

	it('looks up each model on a day without scanning the models array', () => {
		const series = buildDailyModelSeries(['alpha', 'gamma'], 'tokens', true, modelIndices);
		const day = {
			day: '2026-08-28',
			cost: 3,
			tokens: 30,
			models: [
				{ model: 'alpha', cost: 1, tokens: 10 },
				{ model: 'beta', cost: 1, tokens: 5 },
				{ model: 'gamma', cost: 1, tokens: 15 }
			]
		};

		expect(series[0]?.value(day)).toBe(10);
		expect(series[1]?.value(day)).toBe(15);
	});
});

describe('buildModelBreakdownSeries', () => {
	it('uses stable keys and display labels for the token breakdown', () => {
		const series = buildModelBreakdownSeries([modelBreakdown()], 'tokens', false);

		expect(series.map((item) => item.key)).toEqual([...TOKEN_BREAKDOWN_KEYS]);
		expect(series.map((item) => item.label)).toEqual(
			TOKEN_BREAKDOWN_KEYS.map((key) => TOKEN_BREAKDOWN_LABELS[key])
		);
		expect(series[0]?.value(modelBreakdown())).toBe(40);
	});

	it('adds error series with stable keys and a negative Error+ value', () => {
		const withErrors = modelBreakdown({
			tokens: 80,
			errorMinus: 20,
			errorPlus: 10,
			outputTokens: 0
		});
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
		expect(
			groupByDay([
				csvPoint({ date: '2026-08-28T23:30:00.000Z', model: 'alpha', cost: 1.25, tokens: 100 }),
				csvPoint({ date: '2026-08-28T23:45:00.000Z', model: 'beta', cost: 0.5, tokens: 50 }),
				csvPoint({ date: '2026-08-29T00:15:00.000Z', model: 'alpha', cost: null, tokens: 25 })
			])
		).toEqual([
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
		const points = [
			csvPoint({ date: '2026-08-28T00:05:00.000Z', tokens: 10 }),
			csvPoint({ date: '2026-08-28T01:00:00.000Z', tokens: 100 }),
			csvPoint({ date: '2026-08-28T01:59:59.999Z', tokens: 50 }),
			csvPoint({ date: '2026-08-28T02:00:00.000Z', tokens: 20 }),
			csvPoint({ date: '2026-08-28T10:30:00+09:00', tokens: 25 }),
			csvPoint({ date: '2026-08-28T23:59:59.999Z', tokens: 30 }),
			csvPoint({ date: '2026-08-29T00:00:00.000Z', tokens: 40 }),
			csvPoint({ date: '2026-08-30T01:30:00.000Z', tokens: 60 })
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
			csvPoint({ date: '2026-08-25T10:00:00.000Z', tokens: 100 }),
			csvPoint({ date: '2026-08-27T10:00:00.000Z', tokens: 300 })
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
			csvPoint({ date: '2026-07-15T10:00:00.000Z', tokens: 100 }),
			csvPoint({ date: '2026-08-02T10:00:00.000Z', tokens: 300 })
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
			csvPoint({ date: '2026-06-15T10:00:00.000Z', tokens: 100 }),
			csvPoint({ date: '2026-08-27T10:00:00.000Z', tokens: 300 })
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
		const days = groupByDay([csvPoint({ date: '2026-08-02T10:00:00.000Z', tokens: 0 })]);
		const calendar = buildTokenCalendar(days, new Date(2026, 7, 31, 12));

		expect(calendar.range.start).toEqual(new Date(2026, 7, 1));
		expect(calendar.range.end).toEqual(new Date(2026, 8, 1));
	});

	it('puts a late-UTC timestamp on the same day as groupByDay', () => {
		const days = groupByDay([csvPoint({ date: '2026-08-28T23:30:00.000Z', tokens: 100 })]);
		const calendar = buildTokenCalendar(days, new Date('2026-08-31T12:00:00.000Z'));

		expect(days[0]?.day).toBe('2026-08-28');
		expect(calendar.data.find(({ day }) => day === '2026-08-28')?.tokens).toBe(100);
	});
});

describe('filterPointsByDays', () => {
	const points = [
		csvPoint({ date: '2026-07-19T12:00:00.000Z', tokens: 400, cost: 4 }),
		csvPoint({ date: '2026-08-18T12:00:00.000Z', tokens: 300, cost: 3 }),
		csvPoint({ date: '2026-08-25T12:00:00.000Z', tokens: 200, cost: 2 }),
		csvPoint({ date: '2026-08-28T12:00:00.000Z', tokens: 100, cost: 1 })
	];

	it('keeps the inclusive UTC window ending on the latest point', () => {
		expect(filterPointsByDays(points, 1).map((item) => item.date)).toEqual([
			'2026-08-28T12:00:00.000Z'
		]);
		expect(filterPointsByDays(points, 7).map((item) => item.date)).toEqual([
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
		expect(filterPointsByDays([], 7)).toEqual([]);
		expect(filterPointsByDays([], 'all')).toEqual([]);
	});
});
