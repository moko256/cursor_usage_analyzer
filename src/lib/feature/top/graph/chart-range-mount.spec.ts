import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DayRange } from './chart-types';
import { nextPremountRange, rememberMountedRange, yieldToMain } from './chart-range-mount';

describe('rememberMountedRange', () => {
	it('appends a range the first time it is selected', () => {
		expect(rememberMountedRange(['all'], 7)).toEqual(['all', 7]);
	});

	it('keeps the existing list when the range is already mounted', () => {
		const mounted: DayRange[] = ['all', 7];
		expect(rememberMountedRange(mounted, 7)).toBe(mounted);
	});
});

describe('nextPremountRange', () => {
	it('returns 7-day then 1-day after all-time is mounted', () => {
		expect(nextPremountRange(['all'])).toBe(7);
		expect(nextPremountRange(['all', 7])).toBe(1);
		expect(nextPremountRange(['all', 7, 1])).toBeUndefined();
	});
});

describe('yieldToMain', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('uses scheduler.yield when the browser provides it', async () => {
		const yieldMock = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('scheduler', { yield: yieldMock });

		await yieldToMain();

		expect(yieldMock).toHaveBeenCalledOnce();
	});

	it('does not yield when scheduler.yield is missing', () => {
		vi.stubGlobal('scheduler', undefined);
		expect(yieldToMain()).toBeUndefined();

		vi.stubGlobal('scheduler', {});
		expect(yieldToMain()).toBeUndefined();
	});
});
