import type { CsvPoint } from '$lib/csv-parser';
import * as m from '$lib/paraglide/messages';
import { resolveRangeEndDay } from './chart-aggregate';
import {
	addPointToBuckets,
	createRangeBuckets,
	finalizeRangeBuckets,
	type RangeBuckets
} from './chart-accumulate';
import type { DashboardData, DayRange } from './chart-types';
import { addUtcDays, utcDayAndLocalHour } from './chart-utc';

/**
 * Builds every chart payload the dashboard needs. The worker sends this instead
 * of `CsvPoint[]` so the UI never groups rows, and structured clone stays small.
 *
 * One walk over the points fills every range: UTC day and local hour are parsed
 * once, then the row is added to `all` and to any shorter window it belongs to.
 */
export function buildDashboardData(
	points: CsvPoint[],
	unknownModel: string = m.unknown_model(),
	now?: Date
): DashboardData {
	const endDay = resolveRangeEndDay(points, now);
	const start7 = endDay ? addUtcDays(endDay, -6) : null;
	const buckets = {
		1: createRangeBuckets(),
		7: createRangeBuckets(),
		all: createRangeBuckets()
	} satisfies Record<DayRange, RangeBuckets>;

	for (const point of points) {
		const { day, hour } = utcDayAndLocalHour(point.date);
		const model = point.model || unknownModel;
		addPointToBuckets(buckets.all, point, day, hour, model);

		if (endDay && start7 && day <= endDay) {
			if (day >= start7) addPointToBuckets(buckets[7], point, day, hour, model);
			if (day >= endDay) addPointToBuckets(buckets[1], point, day, hour, model);
		}
	}

	return {
		pointCount: points.length,
		totalCost: buckets.all.totalCost,
		totalTokens: buckets.all.totalTokens,
		ranges: {
			1: finalizeRangeBuckets(buckets[1]),
			7: finalizeRangeBuckets(buckets[7]),
			all: finalizeRangeBuckets(buckets.all)
		}
	};
}
