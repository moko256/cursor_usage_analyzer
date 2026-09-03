import type { CsvPoint, TokenBreakdown } from './csv-parser';
import type { ModelBreakdownValue } from './feature/top/graph/chart-types';

export const emptyTokenBreakdown: TokenBreakdown = {
	inputWithCacheWrite: 0,
	inputWithoutCacheWrite: 0,
	cacheRead: 0,
	outputTokens: 0
};

export function csvPoint(overrides: Partial<CsvPoint> = {}): CsvPoint {
	return {
		date: '2026-08-28T12:00:00.000Z',
		model: 'alpha',
		cost: 1,
		tokens: 0,
		...emptyTokenBreakdown,
		...overrides
	};
}

export function modelBreakdown(overrides: Partial<ModelBreakdownValue> = {}): ModelBreakdownValue {
	return {
		model: 'alpha',
		cost: 10,
		tokens: 100,
		inputWithCacheWrite: 40,
		inputWithoutCacheWrite: 20,
		cacheRead: 30,
		outputTokens: 10,
		errorMinus: 0,
		errorPlus: 0,
		...overrides
	};
}
