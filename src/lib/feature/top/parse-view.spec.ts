import { describe, expect, it } from 'vitest';
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
			points: [
				{
					date: '2026-08-28T12:00:00.000Z',
					model: 'alpha',
					cost: 1,
					tokens: 10,
					inputWithCacheWrite: 0,
					inputWithoutCacheWrite: 0,
					cacheRead: 0,
					outputTokens: 0
				}
			]
		};

		expect(toPickerView(view)).toEqual({ status: 'success', pointCount: 1 });
	});
});
