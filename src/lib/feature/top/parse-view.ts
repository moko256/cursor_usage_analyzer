import type { DashboardData } from '$lib/feature/top/graph/chart-types';

export type ParseView =
	| { status: 'idle' }
	| { status: 'loading'; processedChars?: number; totalChars?: number }
	| { status: 'success'; dashboard: DashboardData }
	| { status: 'error'; message: string };

export type PickerView =
	| { status: 'idle' }
	| { status: 'loading'; processedChars?: number; totalChars?: number }
	| { status: 'success'; pointCount: number }
	| { status: 'error'; message: string };

export function toPickerView(view: ParseView): PickerView {
	return view.status === 'success'
		? { status: 'success', pointCount: view.dashboard.pointCount }
		: view;
}

/** Determinate `<progress value>` only while scan is in progress. Start and 100% omit it. */
export function csvProgressValue(
	processedChars: number | undefined,
	totalChars: number | undefined
): number | undefined {
	return processedChars != null && totalChars != null && processedChars < totalChars
		? processedChars
		: undefined;
}
