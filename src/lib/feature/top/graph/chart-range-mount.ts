import type { DayRange } from './chart-types';

export const DASHBOARD_CHART_COUNT = 6;

export const PREMOUNT_RANGES = [7, 1] as const satisfies readonly DayRange[];

export type ChartMountCounts = { [K in DayRange]?: number };

export const INITIAL_CHART_COUNTS = {
	all: DASHBOARD_CHART_COUNT
} as const satisfies ChartMountCounts;

export function chartCountFor(counts: ChartMountCounts, range: DayRange): number {
	return counts[range] ?? 0;
}

export function isRangeComplete(counts: ChartMountCounts, range: DayRange): boolean {
	return chartCountFor(counts, range) >= DASHBOARD_CHART_COUNT;
}

export function mountedRangesFromCounts(counts: ChartMountCounts): DayRange[] {
	const ranges: DayRange[] = [];
	if (chartCountFor(counts, 'all') > 0) ranges.push('all');
	for (const range of PREMOUNT_RANGES) {
		if (chartCountFor(counts, range) > 0) ranges.push(range);
	}
	return ranges;
}

export function ensureRangeVisible(counts: ChartMountCounts, range: DayRange): ChartMountCounts {
	return isRangeComplete(counts, range) ? counts : { ...counts, [range]: DASHBOARD_CHART_COUNT };
}

export function incrementMountedChart(counts: ChartMountCounts, range: DayRange): ChartMountCounts {
	const current = chartCountFor(counts, range);
	if (current >= DASHBOARD_CHART_COUNT) return counts;
	return { ...counts, [range]: current + 1 };
}

export function nextChartMountRange(
	counts: ChartMountCounts,
	activeRange: DayRange
): DayRange | undefined {
	if (chartCountFor(counts, activeRange) < DASHBOARD_CHART_COUNT) {
		return activeRange;
	}

	for (const range of PREMOUNT_RANGES) {
		if (chartCountFor(counts, range) < DASHBOARD_CHART_COUNT) {
			return range;
		}
	}

	if (chartCountFor(counts, 'all') < DASHBOARD_CHART_COUNT) {
		return 'all';
	}

	return undefined;
}

type SchedulerWithYield = {
	yield(): Promise<void>;
};

export function yieldToMain(): Promise<void> {
	const scheduler = (globalThis as { scheduler?: SchedulerWithYield }).scheduler;
	if (typeof scheduler?.yield === 'function') {
		return scheduler.yield();
	}

	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}
