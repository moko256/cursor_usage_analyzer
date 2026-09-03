import { describe, expect, it } from 'vitest';
import { buildDashboardData } from '$lib/feature/top/graph/chart-dashboard';
import { csvPoint } from '$lib/csv-point.fixture';
import { toPickerView, type ParseView } from './parse-view';

describe('toPickerView', () => {
	it('keeps idle, loading, and error views as-is', () => {
		const idle = { status: 'idle' } as const;
		const loading = { status: 'loading' } as const;
		const error = { status: 'error', message: 'nope' } as const;

		expect(toPickerView(idle)).toEqual(idle);
		expect(toPickerView(loading)).toEqual(loading);
		expect(toPickerView(error)).toEqual(error);
	});

	it('exposes only the record count on success', () => {
		const view: ParseView = {
			status: 'success',
			dashboard: buildDashboardData([csvPoint({ tokens: 10 })])
		};

		expect(toPickerView(view)).toEqual({ status: 'success', pointCount: 1 });
	});
});
