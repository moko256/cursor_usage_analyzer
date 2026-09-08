import type { Locator, Page } from '@playwright/test';

export function activeGraphRange(page: Page) {
	return page.locator('.graph-range.is-active');
}

export function activeChartCards(page: Page) {
	return activeGraphRange(page).locator('.chart-card');
}

export function activeLocator(page: Page, selector: string): Locator {
	return activeGraphRange(page).locator(selector);
}

/** Inclusive day count from the Sunday on or before `monthStart` through that month's last day. */
export function sundayPaddedMonthDayCount(monthStart: Date): number {
	const last = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
	const start = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
	start.setDate(start.getDate() - start.getDay());
	return Math.round((last.getTime() - start.getTime()) / 86_400_000) + 1;
}
