import type { CsvPoint } from '$lib/csv-parser';
import { computeTokenBreakdownErrors } from './chart-breakdown';
import type {
	DailyModelValue,
	DailyValue,
	HourlyValue,
	ModelBreakdownValue,
	RangeChartData
} from './chart-types';

type DayBucket = {
	cost: number;
	tokens: number;
	models: Map<string, DailyModelValue>;
};

type ModelBucket = {
	cost: number;
	tokens: number;
	inputWithCacheWrite: number;
	inputWithoutCacheWrite: number;
	cacheRead: number;
	outputTokens: number;
};

export type RangeBuckets = {
	byDay: Map<string, DayBucket>;
	hours: number[];
	byModel: Map<string, ModelBucket>;
	totalCost: number;
	totalTokens: number;
};

export function createRangeBuckets(): RangeBuckets {
	return {
		byDay: new Map(),
		hours: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		byModel: new Map(),
		totalCost: 0,
		totalTokens: 0
	};
}

export function addPointToBuckets(
	buckets: RangeBuckets,
	point: CsvPoint,
	day: string,
	hour: number | null,
	model: string
) {
	const cost = point.cost ?? 0;
	buckets.totalCost += cost;
	buckets.totalTokens += point.tokens;

	let dayValue = buckets.byDay.get(day);
	if (!dayValue) {
		dayValue = { cost: 0, tokens: 0, models: new Map() };
		buckets.byDay.set(day, dayValue);
	}
	dayValue.cost += cost;
	dayValue.tokens += point.tokens;

	let modelDay = dayValue.models.get(model);
	if (!modelDay) {
		modelDay = { model, cost: 0, tokens: 0 };
		dayValue.models.set(model, modelDay);
	}
	modelDay.cost += cost;
	modelDay.tokens += point.tokens;

	if (hour !== null) buckets.hours[hour] += point.tokens;

	let modelValue = buckets.byModel.get(model);
	if (!modelValue) {
		modelValue = {
			cost: 0,
			tokens: 0,
			inputWithCacheWrite: 0,
			inputWithoutCacheWrite: 0,
			cacheRead: 0,
			outputTokens: 0
		};
		buckets.byModel.set(model, modelValue);
	}
	modelValue.cost += cost;
	modelValue.tokens += point.tokens;
	modelValue.inputWithCacheWrite += point.inputWithCacheWrite;
	modelValue.inputWithoutCacheWrite += point.inputWithoutCacheWrite;
	modelValue.cacheRead += point.cacheRead;
	modelValue.outputTokens += point.outputTokens;
}

export function finalizeDays(byDay: RangeBuckets['byDay']): DailyValue[] {
	return Array.from(byDay.entries())
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([day, value]) => ({
			day,
			cost: value.cost,
			tokens: value.tokens,
			models: Array.from(value.models.values()).sort((left, right) =>
				left.model.localeCompare(right.model)
			)
		}));
}

export function finalizeHours(hours: number[]): HourlyValue[] {
	return hours.map((tokens, hour) => ({ hour, tokens }));
}

export function finalizeModels(byModel: RangeBuckets['byModel']): ModelBreakdownValue[] {
	return Array.from(byModel.entries())
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([model, value]) => ({
			model,
			...value,
			...computeTokenBreakdownErrors(value.tokens, value)
		}));
}

export function finalizeRangeBuckets(buckets: RangeBuckets): RangeChartData {
	return {
		byDay: finalizeDays(buckets.byDay),
		byHour: finalizeHours(buckets.hours),
		byModelBreakdown: finalizeModels(buckets.byModel),
		totalCost: buckets.totalCost,
		totalTokens: buckets.totalTokens
	};
}
