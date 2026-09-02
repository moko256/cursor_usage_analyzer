import { describe, expect, it } from 'vitest';
import * as m from '$lib/paraglide/messages';
import { csvPoint, modelBreakdown } from '$lib/csv-point.fixture';
import {
	computeTokenBreakdownErrors,
	groupByModelBreakdown,
	tokenBreakdownCost,
	tokenBreakdownSum,
	tokenBreakdownValue,
	tokenErrorMinusCost,
	tokenErrorPlusCost
} from './chart-utils';

describe('groupByModelBreakdown', () => {
	it('sums tokens, costs, and breakdown columns per model', () => {
		const rows = groupByModelBreakdown([
			csvPoint({
				model: 'beta',
				cost: 2,
				tokens: 40,
				inputWithCacheWrite: 10,
				outputTokens: 30
			}),
			csvPoint({
				model: 'alpha',
				cost: 4,
				tokens: 80,
				inputWithCacheWrite: 20,
				outputTokens: 60
			}),
			csvPoint({
				model: 'alpha',
				cost: null,
				tokens: 20,
				inputWithCacheWrite: 5,
				outputTokens: 15
			})
		]);

		expect(rows).toEqual([
			modelBreakdown({
				model: 'alpha',
				cost: 4,
				tokens: 100,
				inputWithCacheWrite: 25,
				inputWithoutCacheWrite: 0,
				cacheRead: 0,
				outputTokens: 75
			}),
			modelBreakdown({
				model: 'beta',
				cost: 2,
				tokens: 40,
				inputWithCacheWrite: 10,
				inputWithoutCacheWrite: 0,
				cacheRead: 0,
				outputTokens: 30
			})
		]);
	});

	it('uses the unknown-model label and records breakdown errors', () => {
		const [row] = groupByModelBreakdown([
			csvPoint({
				model: '',
				cost: 5,
				tokens: 50,
				inputWithCacheWrite: 10,
				inputWithoutCacheWrite: 10,
				cacheRead: 10,
				outputTokens: 10
			})
		]);

		expect(row?.model).toBe(m.unknown_model());
		expect(row).toMatchObject({ errorMinus: 10, errorPlus: 0 });
	});
});

describe('tokenBreakdownValue', () => {
	it('reads each stable breakdown key', () => {
		const row = modelBreakdown();

		expect(tokenBreakdownValue(row, 'inputWithCacheWrite')).toBe(40);
		expect(tokenBreakdownValue(row, 'inputWithoutCacheWrite')).toBe(20);
		expect(tokenBreakdownValue(row, 'cacheRead')).toBe(30);
		expect(tokenBreakdownValue(row, 'outputTokens')).toBe(10);
	});
});

describe('tokenBreakdownCost', () => {
	it('allocates cost in proportion to the token slice', () => {
		const row = modelBreakdown({ cost: 10, tokens: 100, inputWithCacheWrite: 40 });

		expect(tokenBreakdownCost(row, 'inputWithCacheWrite')).toBe(4);
		expect(tokenBreakdownCost(row, 'outputTokens')).toBe(1);
	});

	it('returns 0 when the model has no tokens', () => {
		expect(tokenBreakdownCost(modelBreakdown({ tokens: 0, cost: 10 }), 'cacheRead')).toBe(0);
	});
});

describe('token error costs', () => {
	it('scales Error- and Error+ against total tokens', () => {
		const row = modelBreakdown({ cost: 10, tokens: 80, errorMinus: 20, errorPlus: 10 });

		expect(tokenErrorMinusCost(row)).toBe(2.5);
		expect(tokenErrorPlusCost(row)).toBe(-1.25);
	});

	it('returns 0 when tokens or the error slice is 0', () => {
		expect(tokenErrorMinusCost(modelBreakdown({ tokens: 0, errorMinus: 10 }))).toBe(0);
		expect(tokenErrorPlusCost(modelBreakdown({ errorPlus: 0 }))).toBe(0);
	});
});

describe('computeTokenBreakdownErrors', () => {
	it('reports missing and surplus tokens against the breakdown sum', () => {
		expect(tokenBreakdownSum(modelBreakdown({ tokens: 80, outputTokens: 0 }))).toBe(90);
		expect(computeTokenBreakdownErrors(80, modelBreakdown({ outputTokens: 0 }))).toEqual({
			errorMinus: 0,
			errorPlus: 10
		});
		expect(computeTokenBreakdownErrors(110, modelBreakdown())).toEqual({
			errorMinus: 10,
			errorPlus: 0
		});
	});
});
