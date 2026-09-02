import type { CsvPoint } from '$lib/csv-parser';

export type ParseView =
	| { status: 'idle' }
	| { status: 'loading' }
	| { status: 'success'; points: CsvPoint[] }
	| { status: 'error'; message: string };

export type PickerView =
	| { status: 'idle' }
	| { status: 'loading' }
	| { status: 'success'; pointCount: number }
	| { status: 'error'; message: string };

export function toPickerView(view: ParseView): PickerView {
	return view.status === 'success' ? { status: 'success', pointCount: view.points.length } : view;
}
