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

export type TokenCalendarDay = {
	day: string;
	date: Date;
	tokens: number;
};

export type TokenCalendarRange = {
	start: Date;
	end: Date;
};

export type HourlyValue = {
	hour: number;
	tokens: number;
};

export const TOKEN_BREAKDOWN_LABELS = [
	'Input (w/ Cache Write)',
	'Input (w/o Cache Write)',
	'Cache Read',
	'Output Tokens'
] as const;

export type TokenBreakdownLabel = (typeof TOKEN_BREAKDOWN_LABELS)[number];

export type ModelBreakdownValue = {
	model: string;
	cost: number;
	tokens: number;
	inputWithCacheWrite: number;
	inputWithoutCacheWrite: number;
	cacheRead: number;
	outputTokens: number;
	errorMinus: number;
	errorPlus: number;
};

export const errorMinusColor = 'light-dark(' + '#868e96, #adb5bd)';
export const errorPlusColor = 'light-dark(' + '#e03131, #ff6b6b)';

// Source: https://picocss.com/docs/colors
// VSCodeでプレビューできるように+で結合している
const dailyModelColors = [
	'light-dark(' + '#748BF8, #3C71F7)',
	'light-dark(' + '#5C7EF8, #5C7EF8)',
	'light-dark(' + '#3C71F7, #748BF8)',
	'light-dark(' + '#2060DF, #8999F9)',
	'light-dark(' + '#1D59D0, #9CA7FA)',
	'light-dark(' + '#184EB8, #AEB5FB)',
	'light-dark(' + '#1343A0, #BFC3FA)',
	'light-dark(' + '#0F3888, #D0D2FA)',
	'light-dark(' + '#0F2D70, #E0E1FA)',
	'light-dark(' + '#0E2358, #F0F0FB)'
] as const;

export function getDailyModelColors(
	modelIndex: number,
	modelLength: number,
	isDark: boolean
): string {
	// dailyModelColorsの先頭から選び、かつ、黒に近い方がグラフの下側に選ばれるようにする
	const index = isDark ? modelIndex : modelLength - modelIndex;

	return dailyModelColors[index % dailyModelColors.length];
}

export function sumCost(points: CsvPoint[]): number {
	return points.reduce((sum, point) => sum + (point.cost ?? 0), 0);
}

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

/** Returns cumulative token counts for every local hour of the day. */
export function groupByHour(points: CsvPoint[]): HourlyValue[] {
	const tokensByHour = new Map<number, number>();

	for (const point of points) {
		const timestamp = Date.parse(point.date);
		if (!Number.isFinite(timestamp)) continue;

		const hour = new Date(timestamp).getHours();
		tokensByHour.set(hour, (tokensByHour.get(hour) ?? 0) + point.tokens);
	}

	return Array.from({ length: 24 }, (_, hour) => ({
		hour,
		tokens: tokensByHour.get(hour) ?? 0
	}));
}

export function buildTokenCalendar(
	days: DailyValue[],
	today = new Date()
): {
	data: TokenCalendarDay[];
	range: TokenCalendarRange;
} {
	if (days.length === 0) {
		const start = startOfWeek(today);
		return { data: [], range: { start, end: addDays(start, 7) } };
	}

	const values = new Map(days.map((day) => [day.day, day.tokens]));
	const firstDay = parseCalendarDay(days[0].day);
	const lastDay = parseCalendarDay(days[days.length - 1].day);
	const currentMonthStart = startOfMonth(today);
	const oldestDataMonthStart = startOfMonth(firstDay);
	const hasCurrentMonthData = days.some((day) => day.day.startsWith(formatCalendarMonth(today)));
	const start = hasCurrentMonthData
		? new Date(Math.min(currentMonthStart.getTime(), oldestDataMonthStart.getTime()))
		: oldestDataMonthStart;
	const end = hasCurrentMonthData ? addDays(startOfDay(today), 1) : startOfNextMonth(lastDay);
	const data: TokenCalendarDay[] = [];

	for (let date = new Date(start); date < end; date = addDays(date, 1)) {
		const day = formatCalendarDay(date);
		data.push({ day, date, tokens: values.get(day) ?? 0 });
	}

	return { data, range: { start, end } };
}

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

export function tokenBreakdownValue(row: ModelBreakdownValue, label: TokenBreakdownLabel): number {
	switch (label) {
		case 'Input (w/ Cache Write)':
			return row.inputWithCacheWrite;
		case 'Input (w/o Cache Write)':
			return row.inputWithoutCacheWrite;
		case 'Cache Read':
			return row.cacheRead;
		case 'Output Tokens':
			return row.outputTokens;
	}
}

export function tokenBreakdownCost(row: ModelBreakdownValue, label: TokenBreakdownLabel): number {
	if (row.tokens === 0) return 0;

	return (row.cost * tokenBreakdownValue(row, label)) / row.tokens;
}

export function tokenErrorMinusCost(row: ModelBreakdownValue): number {
	if (row.tokens === 0 || row.errorMinus === 0) return 0;

	return (row.cost * row.errorMinus) / row.tokens;
}

export function tokenErrorPlusCost(row: ModelBreakdownValue): number {
	if (row.tokens === 0 || row.errorPlus === 0) return 0;

	return (-row.cost * row.errorPlus) / row.tokens;
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

function parseCalendarDay(value: string) {
	const [year, month, day] = value.split('-').map(Number);
	return new Date(year, month - 1, day);
}

function startOfDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfNextMonth(date: Date) {
	return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function formatCalendarMonth(date: Date) {
	return [
		date.getFullYear().toString().padStart(4, '0'),
		(date.getMonth() + 1).toString().padStart(2, '0')
	].join('-');
}

function formatCalendarDay(date: Date) {
	return [
		date.getFullYear().toString().padStart(4, '0'),
		(date.getMonth() + 1).toString().padStart(2, '0'),
		date.getDate().toString().padStart(2, '0')
	].join('-');
}

function startOfWeek(date: Date) {
	return addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), -date.getDay());
}

function addDays(date: Date, count: number) {
	const result = new Date(date);
	result.setDate(result.getDate() + count);
	return result;
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

export function formatHour(value: number) {
	return `${value.toString().padStart(2, '0')}:00`;
}
