import type { CsvPoint } from '$lib/csv-parser';
import * as m from '$lib/paraglide/messages';

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

function utcDay(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value.slice(0, 10) : date.toISOString().slice(0, 10);
}
