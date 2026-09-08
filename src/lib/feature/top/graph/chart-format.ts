import { timeDay } from 'd3-time';
import type { ChartMetric, DailyValue } from './chart-types';
import { addUtcDays, dateFromUtcDay } from './chart-utc';

export const verticalChartPadding = { top: 4, right: 24, bottom: 20, left: 41 } as const;
export const verticalChartHeight = 270;

export const compactNumberFormat = new Intl.NumberFormat('en-US', {
	notation: 'compact',
	maximumFractionDigits: 1
});

export const currencyFormat = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	maximumFractionDigits: 2
});

const siPrefixes = [
	{ value: 1e24, symbol: 'Y' },
	{ value: 1e21, symbol: 'Z' },
	{ value: 1e18, symbol: 'E' },
	{ value: 1e15, symbol: 'P' },
	{ value: 1e12, symbol: 'T' },
	{ value: 1e9, symbol: 'G' },
	{ value: 1e6, symbol: 'M' },
	{ value: 1e3, symbol: 'k' }
] as const;

export function formatTokenAxis(value: number): string {
	if (!Number.isFinite(value)) return String(value);

	const sign = value < 0 ? '-' : '';
	const absoluteValue = Math.abs(value);
	const prefix = siPrefixes.find(({ value: prefixValue }) => absoluteValue >= prefixValue);

	if (!prefix) return `${sign}${Math.round(absoluteValue)}`;

	let roundedValue = Math.round((absoluteValue / prefix.value) * 10) / 10;
	if (roundedValue >= 1000) {
		const nextPrefix = siPrefixes[siPrefixes.indexOf(prefix) - 1];
		if (nextPrefix) {
			roundedValue = Math.round((absoluteValue / nextPrefix.value) * 10) / 10;
			return `${sign}${formatRoundedNumber(roundedValue)}${nextPrefix.symbol}`;
		}
	}

	return `${sign}${formatRoundedNumber(roundedValue)}${prefix.symbol}`;
}

function formatRoundedNumber(value: number) {
	return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatCostAxis(value: number): string {
	if (!Number.isFinite(value)) return String(value);

	const formatted = formatTokenAxis(value);
	return formatted.startsWith('-') ? `-$${formatted.slice(1)}` : `$${formatted}`;
}

export function formatChartAxis(value: number, metric: ChartMetric): string {
	return metric === 'tokens' ? formatTokenAxis(value) : formatCostAxis(value);
}

export function formatChartValue(value: number, metric: ChartMetric): string {
	return metric === 'tokens' ? compactNumberFormat.format(value) : currencyFormat.format(value);
}

const dayLabelFormat = new Intl.DateTimeFormat('en-US', {
	month: 'short',
	day: 'numeric',
	timeZone: 'UTC'
});

export function formatDay(value: string) {
	const date = new Date(`${value}T00:00:00Z`);
	return Number.isNaN(date.getTime()) ? value : dayLabelFormat.format(date);
}

/**
 * Daily bar charts use a local time scale sized for at most one month of days.
 * LayerChart places each bar in a `timeDay` interval; the domain is padded to
 * 30 days so sparse points keep calendar gaps instead of stretching as bands.
 */
export const DAILY_AXIS_MAX_DAYS = 30;
export const dailyAxisInterval = timeDay;
export const dailyAxisTickFormat = { type: 'day', options: { variant: 'short' } } as const;
/** Pixel gap between date-axis ticks on the month-wide daily charts. */
export const dailyAxisTickSpacing = 30;

export type DailyChartPoint = DailyValue & { date: Date };

export function dailyChartPoints(days: DailyValue[]): DailyChartPoint[] {
	return days.map((day) => ({ ...day, date: dateFromUtcDay(day.day) }));
}

export function dailyAxisDomain(days: DailyValue[]): [Date, Date] | undefined {
	if (days.length === 0) return undefined;

	const endDay = days[days.length - 1].day;
	const firstDay = days[0].day;
	const exclusiveEnd = addUtcDays(endDay, 1);
	const paddedStart = addUtcDays(exclusiveEnd, -DAILY_AXIS_MAX_DAYS);
	const startDay = firstDay < paddedStart ? firstDay : paddedStart;

	return [dateFromUtcDay(startDay), dateFromUtcDay(exclusiveEnd)];
}

export function formatHour(value: number) {
	return `${value.toString().padStart(2, '0')}:00`;
}

/** Local-hour axis labels are drawn every 3 hours (00:00, 03:00, …, 21:00). */
const HOURLY_AXIS_TICK_STEP_HOURS = 3;
const HOURLY_BUCKET_COUNT = 24;

export function hourlyAxisTickLabels(): string[] {
	return Array.from({ length: HOURLY_BUCKET_COUNT / HOURLY_AXIS_TICK_STEP_HOURS }, (_, index) =>
		formatHour(index * HOURLY_AXIS_TICK_STEP_HOURS)
	);
}
