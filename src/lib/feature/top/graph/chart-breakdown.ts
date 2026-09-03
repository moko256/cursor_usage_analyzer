import type { CsvPoint } from '$lib/csv-parser';
import * as m from '$lib/paraglide/messages';
import type { ModelBreakdownValue, TokenBreakdownKey } from './chart-types';

const emptyBreakdown = {
	inputWithCacheWrite: 0,
	inputWithoutCacheWrite: 0,
	cacheRead: 0,
	outputTokens: 0
};

export function tokenBreakdownSum(
	breakdown: Pick<ModelBreakdownValue, keyof typeof emptyBreakdown>
) {
	return (
		breakdown.inputWithCacheWrite +
		breakdown.inputWithoutCacheWrite +
		breakdown.cacheRead +
		breakdown.outputTokens
	);
}

export function computeTokenBreakdownErrors(
	tokens: number,
	breakdown: Pick<ModelBreakdownValue, keyof typeof emptyBreakdown>
) {
	const breakdownSum = tokenBreakdownSum(breakdown);

	return {
		errorMinus: Math.max(0, tokens - breakdownSum),
		errorPlus: Math.max(0, breakdownSum - tokens)
	};
}

export function groupByModelBreakdown(
	points: CsvPoint[],
	unknownModel: string = m.unknown_model()
): ModelBreakdownValue[] {
	const byModel = new Map<string, { cost: number; tokens: number } & typeof emptyBreakdown>();

	for (const point of points) {
		const model = point.model || unknownModel;
		const value = byModel.get(model) ?? { cost: 0, tokens: 0, ...emptyBreakdown };

		value.cost += point.cost ?? 0;
		value.tokens += point.tokens;
		value.inputWithCacheWrite += point.inputWithCacheWrite;
		value.inputWithoutCacheWrite += point.inputWithoutCacheWrite;
		value.cacheRead += point.cacheRead;
		value.outputTokens += point.outputTokens;
		byModel.set(model, value);
	}

	return Array.from(byModel.entries())
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([model, value]) => ({
			model,
			...value,
			...computeTokenBreakdownErrors(value.tokens, value)
		}));
}

export function tokenBreakdownValue(row: ModelBreakdownValue, key: TokenBreakdownKey): number {
	return row[key];
}

export function tokenBreakdownCost(row: ModelBreakdownValue, key: TokenBreakdownKey): number {
	if (row.tokens === 0) return 0;

	return (row.cost * tokenBreakdownValue(row, key)) / row.tokens;
}

export function tokenErrorMinusCost(row: ModelBreakdownValue): number {
	if (row.tokens === 0 || row.errorMinus === 0) return 0;

	return (row.cost * row.errorMinus) / row.tokens;
}

export function tokenErrorPlusCost(row: ModelBreakdownValue): number {
	if (row.tokens === 0 || row.errorPlus === 0) return 0;

	return (-row.cost * row.errorPlus) / row.tokens;
}
