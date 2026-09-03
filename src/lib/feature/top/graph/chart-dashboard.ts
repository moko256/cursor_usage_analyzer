import type { CsvPoint } from '$lib/csv-parser';
import { filterPointsByDays, groupByDay, groupByHour, sumCost, sumTokens } from './chart-aggregate';
import { groupByModelBreakdown } from './chart-breakdown';
import { DAY_RANGES, type DashboardData, type DayRange, type RangeChartData } from './chart-types';

/**
 * Builds every chart payload the dashboard needs. The worker sends this instead
 * of `CsvPoint[]` so the UI never groups rows, and structured clone stays small.
 */
export function buildDashboardData(
	points: CsvPoint[],
	unknownModel?: string,
	now?: Date
): DashboardData {
	const ranges = {} as DashboardData['ranges'];

	for (const days of DAY_RANGES) {
		ranges[days] = buildRangeChartData(points, days, unknownModel, now);
	}

	return {
		pointCount: points.length,
		totalCost: sumCost(points),
		totalTokens: sumTokens(points),
		ranges
	};
}

function buildRangeChartData(
	points: CsvPoint[],
	days: DayRange,
	unknownModel: string | undefined,
	now?: Date
): RangeChartData {
	const filtered = filterPointsByDays(points, days, now);

	return {
		byDay: groupByDay(filtered, unknownModel),
		byHour: groupByHour(filtered),
		byModelBreakdown: groupByModelBreakdown(filtered, unknownModel),
		totalCost: sumCost(filtered),
		totalTokens: sumTokens(filtered)
	};
}
