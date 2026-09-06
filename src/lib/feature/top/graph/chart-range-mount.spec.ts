import { describe, expect, it } from 'vitest';
import type { DayRange } from './chart-types';
import { rememberMountedRange } from './chart-range-mount';

describe('rememberMountedRange', () => {
	it('appends a range the first time it is selected', () => {
		expect(rememberMountedRange(['all'], 7)).toEqual(['all', 7]);
	});

	it('keeps the existing list when the range is already mounted', () => {
		const mounted: DayRange[] = ['all', 7];
		expect(rememberMountedRange(mounted, 7)).toBe(mounted);
	});
});
