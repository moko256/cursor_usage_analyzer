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
