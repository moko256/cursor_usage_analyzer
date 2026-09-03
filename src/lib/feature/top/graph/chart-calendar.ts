import type { DailyValue, TokenCalendarDay, TokenCalendarRange } from './chart-types';
import {
	addUtcDays,
	dateFromUtcDay,
	startOfNextUtcMonth,
	startOfUtcMonth,
	startOfUtcWeek,
	utcDayFromDate,
	utcYearMonth
} from './chart-utc';

/**
 * Fills every UTC calendar day from the oldest data month through today (or
 * through the last data month when the current UTC month has no rows).
 * Day keys match `groupByDay`.
 */
export function buildTokenCalendar(
	days: DailyValue[],
	today = new Date()
): {
	data: TokenCalendarDay[];
	range: TokenCalendarRange;
} {
	const todayUtc = utcDayFromDate(today);

	if (days.length === 0) {
		const start = startOfUtcWeek(todayUtc);
		return {
			data: [],
			range: { start: dateFromUtcDay(start), end: dateFromUtcDay(addUtcDays(start, 7)) }
		};
	}

	const values = new Map(days.map((day) => [day.day, day.tokens]));
	const firstDay = days[0].day;
	const lastDay = days[days.length - 1].day;
	const currentMonth = utcYearMonth(today);
	const oldestMonthStart = startOfUtcMonth(firstDay);
	const currentMonthStart = startOfUtcMonth(todayUtc);
	const hasCurrentMonthData = days.some((day) => day.day.startsWith(currentMonth));
	const start = hasCurrentMonthData
		? oldestMonthStart < currentMonthStart
			? oldestMonthStart
			: currentMonthStart
		: oldestMonthStart;
	const end = hasCurrentMonthData ? addUtcDays(todayUtc, 1) : startOfNextUtcMonth(lastDay);
	const data: TokenCalendarDay[] = [];

	for (let day = start; day < end; day = addUtcDays(day, 1)) {
		data.push({ day, date: dateFromUtcDay(day), tokens: values.get(day) ?? 0 });
	}

	return { data, range: { start: dateFromUtcDay(start), end: dateFromUtcDay(end) } };
}
