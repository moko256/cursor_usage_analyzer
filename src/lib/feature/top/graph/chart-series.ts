import * as m from '$lib/paraglide/messages';
import {
	TOKEN_BREAKDOWN_KEYS,
	TOKEN_BREAKDOWN_LABELS,
	type ChartMetric,
	type DailyModelValue,
	type DailyValue,
	type ModelBreakdownSeries,
	type ModelBreakdownValue,
	type ModelIndexTable
} from './chart-types';
import { errorMinusColor, errorPlusColor, getDailyModelColors } from './chart-style';
import {
	tokenBreakdownCost,
	tokenBreakdownValue,
	tokenErrorMinusCost,
	tokenErrorPlusCost
} from './chart-breakdown';

export function buildDailyModelSeries(
	models: string[],
	metric: ChartMetric,
	modelIndices: ModelIndexTable
) {
	const modelValues = new WeakMap<DailyValue, Map<string, DailyModelValue>>();

	function metricValue(day: DailyValue, model: string) {
		let byModel = modelValues.get(day);
		if (!byModel) {
			byModel = new Map(day.models.map((value) => [value.model, value]));
			modelValues.set(day, byModel);
		}

		return byModel.get(model)?.[metric] ?? 0;
	}

	return models.map((model) => ({
		key: model,
		color: getDailyModelColors(modelIndices.indexByName[model] ?? 0, modelIndices.count),
		value: (day: DailyValue) => metricValue(day, model)
	}));
}

export function buildModelBreakdownSeries(
	rows: ModelBreakdownValue[],
	metric: ChartMetric
): ModelBreakdownSeries[] {
	const series: ModelBreakdownSeries[] = TOKEN_BREAKDOWN_KEYS.map((key, index) => ({
		key,
		label: TOKEN_BREAKDOWN_LABELS[key],
		color: getDailyModelColors(index, TOKEN_BREAKDOWN_KEYS.length),
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
