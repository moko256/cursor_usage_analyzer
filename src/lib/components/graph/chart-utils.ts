import type { CsvPoint } from '$lib/csv-parser';
import * as m from '$lib/paraglide/messages';

export const chartWidth = 720;
export const chartHeight = 270;
export const chartPadding = { top: 20, right: 20, bottom: 48, left: 58 };
export const chartBottom = chartHeight - chartPadding.bottom;
export const chartRight = chartWidth - chartPadding.right;
export const plotHeight = chartBottom - chartPadding.top;
export const plotWidth = chartRight - chartPadding.left;

export type DailyModelValue = {
	model: string;
	cost: number;
	tokens: number;
};

export type DailyValue = {
	day: string;
	cost: number;
	tokens: number;
	models: DailyModelValue[];
};

export type ModelValue = {
	model: string;
	cost: number;
	tokens: number;
};

export type DailyCostBar = {
	day: DailyValue;
	x: number;
	y: number;
	width: number;
	height: number;
};

export type StackedDailySegment = {
	model: string;
	value: number;
	x: number;
	y: number;
	width: number;
	height: number;
};

export type StackedDailyBar = {
	day: DailyValue;
	segments: StackedDailySegment[];
};

export type HorizontalBar = ModelValue & {
	value: number;
	y: number;
	width: number;
	barStart: number;
	barEnd: number;
};

const currency = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	maximumFractionDigits: 2
});

const compactNumber = new Intl.NumberFormat('en-US', {
	notation: 'compact',
	maximumFractionDigits: 1
});

export function groupByDay(points: CsvPoint[]): DailyValue[] {
	const byDay = new Map<
		string,
		{ cost: number; tokens: number; models: Map<string, DailyModelValue> }
	>();

	for (const point of points) {
		const day = utcDay(point.date);
		const dayValue = byDay.get(day) ?? { cost: 0, tokens: 0, models: new Map() };
		const model = point.model || m.unknown_model();
		const modelValue = dayValue.models.get(model) ?? { model, cost: 0, tokens: 0 };

		dayValue.cost += point.cost ?? 0;
		dayValue.tokens += point.tokens;
		modelValue.cost += point.cost ?? 0;
		modelValue.tokens += point.tokens;
		dayValue.models.set(model, modelValue);
		byDay.set(day, dayValue);
	}

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

export function groupByModel(points: CsvPoint[]): ModelValue[] {
	const byModel = new Map<string, { cost: number; tokens: number }>();

	for (const point of points) {
		const model = point.model || m.unknown_model();
		const value = byModel.get(model) ?? { cost: 0, tokens: 0 };
		value.cost += point.cost ?? 0;
		value.tokens += point.tokens;
		byModel.set(model, value);
	}

	return Array.from(byModel.entries())
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([model, value]) => ({ model, ...value }));
}

export function getDailyCostBars(dayValues: DailyValue[], dailyCostScale: number): DailyCostBar[] {
	const slotWidth = plotWidth / Math.max(dayValues.length, 1);
	const barWidth = Math.min(54, Math.max(14, slotWidth * 0.62));

	return dayValues.map((day, index) => {
		const valueHeight = (Math.max(day.cost, 0) / dailyCostScale) * plotHeight;
		return {
			day,
			x: chartPadding.left + slotWidth * index + (slotWidth - barWidth) / 2,
			y: chartBottom - valueHeight,
			width: barWidth,
			height: Math.max(valueHeight, 1)
		};
	});
}

export function getStackedDailyBars(
	dayValues: DailyValue[],
	models: string[],
	dailyCostScale: number
): StackedDailyBar[] {
	const slotWidth = plotWidth / Math.max(dayValues.length, 1);
	const barWidth = Math.min(54, Math.max(14, slotWidth * 0.62));

	return dayValues.map((day, index) => {
		const valuesByModel = new Map(day.models.map((value) => [value.model, value.cost]));
		let offset = 0;
		const segments = models.map((model) => {
			const value = Math.max(valuesByModel.get(model) ?? 0, 0);
			const segmentHeight = (value / dailyCostScale) * plotHeight;
			const segment = {
				model,
				value,
				x: chartPadding.left + slotWidth * index + (slotWidth - barWidth) / 2,
				y: chartBottom - offset - segmentHeight,
				width: barWidth,
				height: Math.max(segmentHeight, value === 0 ? 0 : 1)
			};
			offset += segmentHeight;
			return segment;
		});

		return { day, segments };
	});
}

export function getHorizontalBars(
	values: ModelValue[],
	key: 'cost' | 'tokens',
	maximum: number
): HorizontalBar[] {
	const rowHeight = 36;
	const barStart = 130;
	const barEnd = chartWidth - 24;
	const scale = Math.max(maximum, 1);

	return values.map((modelValue, index) => {
		const value = Math.max(modelValue[key], 0);
		return {
			...modelValue,
			value,
			y: 28 + index * rowHeight,
			width: ((barEnd - barStart) * value) / scale,
			barStart,
			barEnd
		};
	});
}

export function formatDay(value: string) {
	const date = new Date(`${value}T00:00:00Z`);
	return Number.isNaN(date.getTime())
		? value
		: new Intl.DateTimeFormat('en-US', {
				month: 'short',
				day: 'numeric',
				timeZone: 'UTC'
			}).format(date);
}

export function formatCurrency(value: number) {
	return currency.format(value);
}

export function formatNumber(value: number) {
	return compactNumber.format(value);
}

function utcDay(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value.slice(0, 10) : date.toISOString().slice(0, 10);
}
