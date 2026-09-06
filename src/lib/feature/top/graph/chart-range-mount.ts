import type { DayRange } from './chart-types';

export const PREMOUNT_RANGES = [7, 1] as const satisfies readonly DayRange[];

export function rememberMountedRange(mounted: DayRange[], next: DayRange): DayRange[] {
	return mounted.includes(next) ? mounted : [...mounted, next];
}

export function nextPremountRange(mounted: readonly DayRange[]): DayRange | undefined {
	return PREMOUNT_RANGES.find((range) => !mounted.includes(range));
}
