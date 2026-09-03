import { describe, expect, it } from 'vitest';
import { csvPoint } from '$lib/csv-point.fixture';
import { buildDashboardData } from './chart-dashboard';
import { filterPointsByDays, groupByDay, groupByHour, sumCost, sumTokens } from './chart-aggregate';
import { groupByModelBreakdown } from './chart-breakdown';
import { DAY_RANGES } from './chart-types';

describe('buildDashboardData', () => {
	const points = [
		csvPoint({ date: '2026-07-19T12:00:00.000Z', tokens: 400, cost: 4, model: 'alpha' }),
		csvPoint({ date: '2026-08-18T12:00:00.000Z', tokens: 300, cost: 3, model: 'beta' }),
		csvPoint({ date: '2026-08-25T12:00:00.000Z', tokens: 200, cost: 2, model: 'alpha' }),
		csvPoint({ date: '2026-08-28T12:00:00.000Z', tokens: 100, cost: 1, model: 'alpha' })
	];

	it('keeps all-time totals and a payload for every range', () => {
		const dashboard = buildDashboardData(points);

		expect(dashboard.pointCount).toBe(4);
		expect(dashboard.totalCost).toBe(sumCost(points));
		expect(dashboard.totalTokens).toBe(sumTokens(points));
		expect(Object.keys(dashboard.ranges)).toEqual(DAY_RANGES.map(String));
	});

	it('matches filter-then-group for each range', () => {
		const dashboard = buildDashboardData(points);

		for (const days of DAY_RANGES) {
			const filtered = filterPointsByDays(points, days);

			expect(dashboard.ranges[days]).toEqual({
				byDay: groupByDay(filtered),
				byHour: groupByHour(filtered),
				byModelBreakdown: groupByModelBreakdown(filtered)
			});
		}
	});

	it('uses the supplied unknown-model label', () => {
		const dashboard = buildDashboardData([csvPoint({ model: '', tokens: 10, cost: 1 })], '不明');

		expect(dashboard.ranges.all.byDay[0]?.models[0]?.model).toBe('不明');
		expect(dashboard.ranges.all.byModelBreakdown[0]?.model).toBe('不明');
	});
});
