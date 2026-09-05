import { expect, test, type Locator, type Page } from '@playwright/test';

const csv = [
	'Date,Model,Total Tokens,Cost',
	'2026-08-20T12:00:00.000Z,alpha,100,1',
	'2026-08-25T12:00:00.000Z,beta,200,2',
	'2026-08-28T23:00:00.000Z,gamma,300,3'
].join('\n');

const tallTooltipCsv = [
	'Date,Model,Total Tokens,Cost',
	...Array.from({ length: 20 }, (_, index) => `2026-08-28T12:00:00.000Z,model-${index},100,1`)
].join('\n');

test.use({ viewport: { width: 900, height: 640 } });

async function loadCsv(page: Page, contents: string) {
	await page.goto('/cursor_usage_analyzer/en/');
	await page.waitForLoadState('networkidle');
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(contents)
	});
	await expect(page.locator('.chart-card')).toHaveCount(6);
}

async function visibleTooltip(page: Page) {
	const tooltip = page.locator('.lc-tooltip-root:not([inert])');
	await expect(tooltip).toBeVisible();
	return tooltip;
}

async function expectTooltipInViewport(page: Page) {
	const tooltip = await visibleTooltip(page);
	const padding = 8;

	await expect
		.poll(async () =>
			tooltip.evaluate((node, inset) => {
				const box = node.getBoundingClientRect();
				const viewport = window.visualViewport;
				const left = viewport?.offsetLeft ?? 0;
				const top = viewport?.offsetTop ?? 0;
				const right = left + (viewport?.width ?? window.innerWidth);
				const bottom = top + (viewport?.height ?? window.innerHeight);

				return {
					left: box.left,
					top: box.top,
					right: box.right,
					bottom: box.bottom,
					viewportRight: right,
					viewportBottom: bottom,
					inside:
						box.left >= left + inset - 1 &&
						box.top >= top + inset - 1 &&
						box.right <= right - inset + 1 &&
						box.bottom <= bottom - inset + 1
				};
			}, padding)
		)
		.toMatchObject({ inside: true });
}

async function hoverChartCorner(card: Locator, corner: 'bottom-right' | 'top-left') {
	const hit = card.locator('.lc-tooltip-rect, .lc-rect').last();
	await expect(hit).toBeVisible();
	const box = await hit.boundingBox();
	expect(box).not.toBeNull();

	await hit.hover({
		position:
			corner === 'bottom-right'
				? { x: Math.max(1, box!.width - 2), y: Math.max(1, box!.height - 2) }
				: { x: 2, y: 2 }
	});
}

async function dockToViewportBottom(card: Locator) {
	await card.evaluate((node) => {
		const rect = node.getBoundingClientRect();
		window.scrollBy({ top: rect.bottom - window.innerHeight + 4 });
	});
}

test('hourly chart tooltip stays in the viewport at the bottom-right edge', async ({ page }) => {
	await loadCsv(page, csv);
	const hourly = page.locator('.hourly-token-card');
	await dockToViewportBottom(hourly);
	await hoverChartCorner(hourly, 'bottom-right');
	await expectTooltipInViewport(page);
});

test('cost chart tooltip stays in the viewport at the right edge', async ({ page }) => {
	await loadCsv(page, csv);
	const cost = page.locator('.chart-card').nth(1);
	await hoverChartCorner(cost, 'bottom-right');
	await expectTooltipInViewport(page);
});

test('calendar tooltip stays in the viewport on the last cell', async ({ page }) => {
	await loadCsv(page, csv);
	const calendar = page.locator('.calendar-card');
	await dockToViewportBottom(calendar);
	await hoverChartCorner(calendar, 'bottom-right');
	await expectTooltipInViewport(page);
});

test('tall daily-model tooltip stays in the viewport', async ({ page }) => {
	await loadCsv(page, tallTooltipCsv);
	const daily = page.locator('.chart-card').nth(0);
	await hoverChartCorner(daily, 'top-left');
	await expectTooltipInViewport(page);

	const tooltip = await visibleTooltip(page);
	const size = await tooltip.evaluate((node) => {
		const box = node.getBoundingClientRect();
		return { height: box.height, viewportHeight: window.innerHeight };
	});
	expect(size.height).toBeLessThanOrEqual(size.viewportHeight - 16 + 1);
});
