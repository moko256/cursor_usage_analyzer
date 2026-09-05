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
import {
	errorMinusColor,
	errorPlusColor,
	getDailyModelColors,
	getTokenBreakdownColor
} from './chart-style';
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
	metric: ChartMetric,
	modelIndices: ModelIndexTable
): ModelBreakdownSeries[] {
	const tokenColorsByModel = new Map<string, string[]>();

	function tokenFill(model: string, tokenIndex: number) {
		let colors = tokenColorsByModel.get(model);
		if (!colors) {
			const modelColor = getDailyModelColors(
				modelIndices.indexByName[model] ?? 0,
				modelIndices.count
			);
			colors = TOKEN_BREAKDOWN_KEYS.map((_, index) =>
				getTokenBreakdownColor(index, TOKEN_BREAKDOWN_KEYS.length, modelColor)
			);
			tokenColorsByModel.set(model, colors);
		}

		return colors[tokenIndex] ?? colors[0];
	}

	const series: ModelBreakdownSeries[] = TOKEN_BREAKDOWN_KEYS.map((key, index) => {
		const fill = (row: ModelBreakdownValue) => tokenFill(row.model, index);

		return {
			key,
			label: TOKEN_BREAKDOWN_LABELS[key],
			color: tokenFill(modelIndices.names[0] ?? '', index),
			fill,
			value: (row) =>
				metric === 'tokens' ? tokenBreakdownValue(row, key) : tokenBreakdownCost(row, key)
		};
	});

	if (rows.some((row) => row.errorMinus > 0)) {
		const fill = () => errorMinusColor;
		series.push({
			key: 'errorMinus',
			label: m.token_error_minus(),
			color: errorMinusColor,
			fill,
			value: (row) => (metric === 'tokens' ? row.errorMinus : tokenErrorMinusCost(row))
		});
	}

	if (rows.some((row) => row.errorPlus > 0)) {
		const fill = () => errorPlusColor;
		series.push({
			key: 'errorPlus',
			label: m.token_error_plus(),
			color: errorPlusColor,
			fill,
			value: (row) => (metric === 'tokens' ? -row.errorPlus : tokenErrorPlusCost(row))
		});
	}

	return series;
}
