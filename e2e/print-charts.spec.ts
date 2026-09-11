import { expect, test } from '@playwright/test';
import { activeChartCards, activeLocator } from './helpers/chart-locators';

const csv = [
	'Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost',
	'2026-07-19T12:00:00.000Z,alpha,0,0,0,0,400,4',
	'2026-08-18T12:00:00.000Z,alpha,0,0,0,0,300,3',
	'2026-08-25T12:00:00.000Z,alpha,0,0,0,0,200,2',
	'2026-08-28T12:00:00.000Z,alpha,0,0,0,0,100,1'
].join('\n');

function columnCount(gridTemplateColumns: string) {
	return gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length;
}

test('print stacks charts in one column and keeps cards on one page', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto('/cursor_usage_analyzer/en/');
	await page.waitForLoadState('networkidle');
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(csv)
	});

	await expect(page.getByText('4 records loaded')).toBeVisible();
	await expect(activeChartCards(page)).toHaveCount(6);

	const grid = activeLocator(page, '.graph-group-grid');
	const cards = activeChartCards(page);
	const firstCard = cards.first();

	await expect
		.poll(async () =>
			columnCount(await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns))
		)
		.toBe(2);
	await expect
		.poll(async () => firstCard.evaluate((el) => getComputedStyle(el).breakInside))
		.toBe('auto');

	const screenFirst = await cards.nth(0).boundingBox();
	const screenSecond = await cards.nth(1).boundingBox();
	expect(screenFirst).toBeTruthy();
	expect(screenSecond).toBeTruthy();
	expect(screenSecond!.x).toBeGreaterThan(screenFirst!.x + screenFirst!.width / 2);

	await page.emulateMedia({ media: 'print' });

	await expect
		.poll(async () =>
			columnCount(await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns))
		)
		.toBe(1);
	await expect
		.poll(async () => firstCard.evaluate((el) => getComputedStyle(el).breakInside))
		.toBe('avoid');
	await expect
		.poll(async () => firstCard.evaluate((el) => getComputedStyle(el).pageBreakInside))
		.toBe('avoid');

	const printFirst = await cards.nth(0).boundingBox();
	const printSecond = await cards.nth(1).boundingBox();
	expect(printFirst).toBeTruthy();
	expect(printSecond).toBeTruthy();
	expect(printSecond!.y).toBeGreaterThan(printFirst!.y + printFirst!.height / 2);
	expect(Math.abs(printSecond!.x - printFirst!.x)).toBeLessThan(8);
});
