import type { DashboardData } from '$lib/feature/top/graph/chart-types';

export type ParseView =
	| { status: 'idle' }
	| { status: 'loading' }
	| { status: 'success'; dashboard: DashboardData }
	| { status: 'error'; message: string };

export type PickerView =
	| { status: 'idle' }
	| { status: 'loading' }
	| { status: 'success'; pointCount: number }
	| { status: 'error'; message: string };

export function toPickerView(view: ParseView): PickerView {
	return view.status === 'success'
		? { status: 'success', pointCount: view.dashboard.pointCount }
		: view;
}
