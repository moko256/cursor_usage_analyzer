import type { CsvPoint } from '$lib/csv-parser';
import * as m from '$lib/paraglide/messages';
import {
	TOKEN_BREAKDOWN_KEYS,
	TOKEN_BREAKDOWN_LABELS,
	type ChartMetric,
	type ModelBreakdownSeries,
	type ModelBreakdownValue,
	type TokenBreakdownKey
} from './chart-types';
import { errorMinusColor, errorPlusColor, getDailyModelColors } from './chart-style';

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

export function groupByModelBreakdown(points: CsvPoint[]): ModelBreakdownValue[] {
	const byModel = new Map<string, { cost: number; tokens: number } & typeof emptyBreakdown>();

	for (const point of points) {
		const model = point.model || m.unknown_model();
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

export function buildModelBreakdownSeries(
	rows: ModelBreakdownValue[],
	metric: ChartMetric,
	isDark: boolean
): ModelBreakdownSeries[] {
	const series: ModelBreakdownSeries[] = TOKEN_BREAKDOWN_KEYS.map((key, index) => ({
		key,
		label: TOKEN_BREAKDOWN_LABELS[key],
		color: getDailyModelColors(index, TOKEN_BREAKDOWN_KEYS.length, isDark),
		value: (row) =>
			metric === 'tokens' ? tokenBreakdownValue(row, key) : tokenBreakdownCost(row, key)
	}));

	if (rows.some((row) => row.errorMinus > 0)) {
		series.push({
			key: 'errorMinus',
			label: m.token_error_minus(),
			color: errorMinusColor,
			value: (row) => (metric === 'tokens' ? row.errorMinus : tokenErrorMinusCost(row))
		});
	}

	if (rows.some((row) => row.errorPlus > 0)) {
		series.push({
			key: 'errorPlus',
			label: m.token_error_plus(),
			color: errorPlusColor,
			value: (row) => (metric === 'tokens' ? -row.errorPlus : tokenErrorPlusCost(row))
		});
	}

	return series;
}
