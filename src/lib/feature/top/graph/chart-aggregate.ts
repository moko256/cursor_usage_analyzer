import type { CsvPoint } from '$lib/csv-parser';
import * as m from '$lib/paraglide/messages';
import { finalizeDays, finalizeHours } from './chart-accumulate';
import type {
	DailyModelValue,
	DailyValue,
	DayRange,
	HourlyValue,
	ModelIndexTable
} from './chart-types';
import { addUtcDays, utcDay, utcDayAndLocalHour } from './chart-utc';

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

	const startDay = addUtcDays(endDay, 1 - days);

	return points.filter((point) => {
		const day = utcDay(point.date);
		return day >= startDay && day <= endDay;
	});
}

export function resolveRangeEndDay(points: CsvPoint[], now?: Date): string | null {
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
		let dayValue = byDay.get(day);
		if (!dayValue) {
			dayValue = { cost: 0, tokens: 0, models: new Map() };
			byDay.set(day, dayValue);
		}

		const model = point.model || unknownModel;
		let modelValue = dayValue.models.get(model);
		if (!modelValue) {
			modelValue = { model, cost: 0, tokens: 0 };
			dayValue.models.set(model, modelValue);
		}

		const cost = point.cost ?? 0;
		dayValue.cost += cost;
		dayValue.tokens += point.tokens;
		modelValue.cost += cost;
		modelValue.tokens += point.tokens;
	}

	return finalizeDays(byDay);
}

/** Cumulative tokens for every local hour-of-day. Days stay UTC; this histogram is local on purpose. */
export function groupByHour(points: CsvPoint[]): HourlyValue[] {
	const tokensByHour = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

	for (const point of points) {
		const hour = utcDayAndLocalHour(point.date).hour;
		if (hour !== null) tokensByHour[hour] += point.tokens;
	}

	return finalizeHours(tokensByHour);
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
