import type { CsvPoint } from '$lib/csv-parser';
import * as m from '$lib/paraglide/messages';
import { getStringWidth, truncateText } from 'layerchart';

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

/**
 * Mirrors LayerChart's `.lc-axis-tick-label` rule so a measured width matches the drawn one.
 * `getStringWidth` only assigns the properties it is handed, but types them as a whole
 * `CSSStyleDeclaration`.
 */
const tickLabelStyle = { fontSize: '10px', fontWeight: '300' } as unknown as CSSStyleDeclaration;

/** Keeps an unusually long model name from squeezing the bars out of the plot area. */
const maxModelLabelWidth = 180;

/** Separates a model name from the plot area: LayerChart's default tick length plus breathing room. */
const modelLabelGap = 8;

/** Room for the outermost value tick label, which is centred on the end of the value axis. */
const valueLabelInset = 24;

export function truncateModelLabel(model: string) {
	return truncateText(model, { maxWidth: maxModelLabelWidth, style: tickLabelStyle });
}

/**
 * LayerChart reserves a fixed 20px on the left of a chart, which fits the short numeric ticks of a
 * vertical chart but not the model names a horizontal one puts there: tick labels are drawn
 * right-aligned from the plot origin, so anything wider lands outside the SVG and is clipped away.
 * Top and bottom repeat LayerChart's own defaults, which have to be restated once `padding` is set.
 */
export function modelAxisPadding(models: string[]) {
	const labelWidth = models.reduce((widest, model) => Math.max(widest, measureLabel(model)), 0);

	return {
		top: 4,
		right: valueLabelInset,
		bottom: 20,
		left: Math.ceil(Math.min(labelWidth, maxModelLabelWidth)) + modelLabelGap
	};
}

function measureLabel(text: string) {
	return getStringWidth(text, tickLabelStyle) ?? text.length * 6;
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
