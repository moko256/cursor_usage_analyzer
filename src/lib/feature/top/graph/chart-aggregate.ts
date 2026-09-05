import type { CsvPoint } from '$lib/csv-parser';
import * as m from '$lib/paraglide/messages';
import type {
	DailyModelValue,
	DailyValue,
	DayRange,
	HourlyValue,
	ModelIndexTable
} from './chart-types';
import { utcDay } from './chart-utc';

export function sumCost(points: CsvPoint[]): number {
	return points.reduce((sum, point) => sum + (point.cost ?? 0), 0);
}

export function sumTokens(points: CsvPoint[]): number {
	return points.reduce((sum, point) => sum + point.tokens, 0);
}

/**
 * Keeps points whose UTC calendar day falls in the inclusive window of `days`
 * ending on `now`, or on the latest point when `now` is omitted.
 * `'all'` returns every point.
 */
export function filterPointsByDays(points: CsvPoint[], days: DayRange, now?: Date): CsvPoint[] {
	if (days === 'all') return points;

	const endDay = resolveRangeEndDay(points, now);
	if (!endDay) return [];

	const startDate = new Date(`${endDay}T00:00:00.000Z`);
	startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
	const startDay = startDate.toISOString().slice(0, 10);

	return points.filter((point) => {
		const day = utcDay(point.date);
		return day >= startDay && day <= endDay;
	});
}

function resolveRangeEndDay(points: CsvPoint[], now?: Date): string | null {
	if (now) return utcDay(now.toISOString());

	let latest = Number.NEGATIVE_INFINITY;
	for (const point of points) {
		const timestamp = Date.parse(point.date);
		if (Number.isFinite(timestamp) && timestamp > latest) latest = timestamp;
	}

	return Number.isFinite(latest) ? new Date(latest).toISOString().slice(0, 10) : null;
}

export function groupByDay(
	points: CsvPoint[],
	unknownModel: string = m.unknown_model()
): DailyValue[] {
	const byDay = new Map<
		string,
		{ cost: number; tokens: number; models: Map<string, DailyModelValue> }
	>();

	for (const point of points) {
		const day = utcDay(point.date);
		const dayValue = byDay.get(day) ?? { cost: 0, tokens: 0, models: new Map() };
		const model = point.model || unknownModel;
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

/** Cumulative tokens for every local hour-of-day. Days stay UTC; this histogram is local on purpose. */
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

export function modelsFromDays(days: DailyValue[]): string[] {
	return [...new Set(days.flatMap((day) => day.models.map((value) => value.model)))].sort(
		(left, right) => left.localeCompare(right)
	);
}

/**
 * Assigns a unique 0-based index to every distinct model after dictionary sort.
 * Empty model names use `unknownModel`, matching `groupByDay`.
 */
export function buildModelIndexTable(
	points: CsvPoint[],
	unknownModel: string = m.unknown_model()
): ModelIndexTable {
	const names = [...new Set(points.map((point) => point.model || unknownModel))].sort(
		(left, right) => left.localeCompare(right)
	);
	const indexByName: Record<string, number> = {};
	for (let index = 0; index < names.length; index += 1) {
		indexByName[names[index]] = index;
	}

	return { names, indexByName, count: names.length };
}
