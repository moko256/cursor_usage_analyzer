import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DayRange } from './chart-types';
import {
	DASHBOARD_CHART_COUNT,
	chartCountFor,
	ensureRangeVisible,
	incrementMountedChart,
	mountedRangesFromCounts,
	nextChartMountRange,
	yieldToMain
} from './chart-range-mount';

describe('chartCountFor', () => {
	it('returns 0 for a range that has not started mounting', () => {
		expect(chartCountFor({ all: 1 }, 7)).toBe(0);
	});
});

describe('mountedRangesFromCounts', () => {
	it('lists all-time first, then premount ranges that have at least one chart', () => {
		expect(mountedRangesFromCounts({ all: 1 })).toEqual(['all']);
		expect(mountedRangesFromCounts({ all: 6, 1: 2 })).toEqual(['all', 1]);
		expect(mountedRangesFromCounts({ all: 6, 7: 1, 1: 1 })).toEqual(['all', 7, 1]);
	});
});

describe('ensureRangeVisible', () => {
	it('starts an unmounted range with the first chart', () => {
		expect(ensureRangeVisible({ all: 1 }, 7)).toEqual({ all: 1, 7: 1 });
	});

	it('keeps the existing object when the range already has charts', () => {
		const counts = { all: 6, 7: 3 };
		expect(ensureRangeVisible(counts, 7)).toBe(counts);
	});
});

describe('incrementMountedChart', () => {
	it('adds one chart until the dashboard count is reached', () => {
		expect(incrementMountedChart({ all: 1 }, 'all')).toEqual({ all: 2 });
		const complete = { all: DASHBOARD_CHART_COUNT };
		expect(incrementMountedChart(complete, 'all')).toBe(complete);
	});
});

describe('nextChartMountRange', () => {
	it('finishes the active range before premounting the others', () => {
		expect(nextChartMountRange({ all: 1 }, 'all')).toBe('all');
		expect(nextChartMountRange({ all: 6 }, 'all')).toBe(7);
		expect(nextChartMountRange({ all: 6, 7: 6 }, 'all')).toBe(1);
		expect(nextChartMountRange({ all: 6, 7: 6, 1: 6 }, 'all')).toBeUndefined();
	});

	it('prioritizes a newly selected range over leftover premount work', () => {
		const counts = { all: 4, 7: 2 };
		expect(nextChartMountRange(counts, 1)).toBe(1);
		expect(nextChartMountRange({ ...counts, 1: 1 }, 1)).toBe(1);
	});

	it('returns all-time last when it is incomplete and not active', () => {
		const counts: { [K in DayRange]?: number } = { all: 3, 7: 6, 1: 6 };
		expect(nextChartMountRange(counts, 7)).toBe('all');
	});
});

describe('yieldToMain', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('uses scheduler.yield when the browser provides it', async () => {
		const yieldMock = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('scheduler', { yield: yieldMock });

		await yieldToMain();

		expect(yieldMock).toHaveBeenCalledOnce();
	});

	it('falls back to setTimeout when scheduler.yield is missing', async () => {
		vi.stubGlobal('scheduler', undefined);
		vi.useFakeTimers();

		const pending = yieldToMain();
		await vi.runAllTimersAsync();
		await pending;

		expect(await pending).toBeUndefined();
	});
});
