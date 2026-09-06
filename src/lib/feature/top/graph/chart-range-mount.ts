import type { DayRange } from './chart-types';

export function rememberMountedRange(mounted: DayRange[], next: DayRange): DayRange[] {
	return mounted.includes(next) ? mounted : [...mounted, next];
}
