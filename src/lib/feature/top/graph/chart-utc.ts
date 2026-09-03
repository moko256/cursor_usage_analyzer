/** UTC calendar day `YYYY-MM-DD` for an ISO timestamp or ISO date. */
export function utcDay(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value.slice(0, 10) : date.toISOString().slice(0, 10);
}

export function utcDayFromDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export function utcYearMonth(date: Date): string {
	return date.toISOString().slice(0, 7);
}

/** Local midnight of a UTC `YYYY-MM-DD`, so LayerChart places the cell on that civil date. */
export function dateFromUtcDay(day: string): Date {
	const [year, month, dayOfMonth] = day.split('-').map(Number);
	return new Date(year, month - 1, dayOfMonth);
}

export function addUtcDays(day: string, count: number): string {
	const date = new Date(`${day}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + count);
	return date.toISOString().slice(0, 10);
}

export function startOfUtcMonth(day: string): string {
	return `${day.slice(0, 7)}-01`;
}

export function startOfNextUtcMonth(day: string): string {
	const date = new Date(`${startOfUtcMonth(day)}T00:00:00.000Z`);
	date.setUTCMonth(date.getUTCMonth() + 1);
	return date.toISOString().slice(0, 10);
}

export function startOfUtcWeek(day: string): string {
	const date = new Date(`${day}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() - date.getUTCDay());
	return date.toISOString().slice(0, 10);
}
