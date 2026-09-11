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

	const screenContainerMaxWidth = await page
		.locator('main.container')
		.evaluate((el) => getComputedStyle(el).maxWidth);
	expect(screenContainerMaxWidth).toBe('1200px');

	await page.emulateMedia({ media: 'print' });

	await expect
		.poll(async () => {
			const style = await grid.evaluate((el) => {
				const computed = getComputedStyle(el);
				return { display: computed.display, columns: computed.gridTemplateColumns };
			});
			return style.display === 'block' ? 1 : columnCount(style.columns);
		})
		.toBe(1);
	await expect
		.poll(async () => firstCard.evaluate((el) => getComputedStyle(el).breakInside))
		.toBe('avoid');
	await expect
		.poll(async () => firstCard.evaluate((el) => getComputedStyle(el).pageBreakInside))
		.toBe('avoid');
	await expect
		.poll(async () => page.locator('.graph-range.is-active .chart-card.print-break-before').count())
		.toBeGreaterThan(0);

	const printFirst = await cards.nth(0).boundingBox();
	const printSecond = await cards.nth(1).boundingBox();
	expect(printFirst).toBeTruthy();
	expect(printSecond).toBeTruthy();
	expect(printSecond!.y).toBeGreaterThan(printFirst!.y + printFirst!.height / 2);
	expect(Math.abs(printSecond!.x - printFirst!.x)).toBeLessThan(8);

	await expect
		.poll(async () => page.locator('main.container').evaluate((el) => getComputedStyle(el).maxWidth))
		.toBe('none');
});

function cssPx(value: string) {
	return Number.parseFloat(value);
}

test('print content fills the page width with no horizontal padding', async ({ page }) => {
	await page.setViewportSize({ width: 500, height: 800 });
	await page.goto('/cursor_usage_analyzer/en/');
	await page.waitForLoadState('networkidle');
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(csv)
	});

	await expect(page.getByText('4 records loaded')).toBeVisible();

	const container = page.locator('main.container');
	const firstCard = activeChartCards(page).first();
	const figure = firstCard.locator('figure');
	const chartRoot = firstCard.locator('.lc-root-container');
	const copyButton = firstCard.getByRole('button', { name: 'Copy' });

	const screenContainer = await container.evaluate((el) => {
		const style = getComputedStyle(el);
		return {
			maxWidth: style.maxWidth,
			paddingLeft: style.paddingLeft,
			paddingRight: style.paddingRight
		};
	});
	const screenCard = await firstCard.evaluate((el) => {
		const style = getComputedStyle(el);
		return { paddingLeft: style.paddingLeft, paddingRight: style.paddingRight };
	});

	expect(cssPx(screenContainer.paddingLeft)).toBeGreaterThan(0);
	expect(cssPx(screenContainer.paddingRight)).toBeGreaterThan(0);
	expect(cssPx(screenCard.paddingLeft)).toBeGreaterThan(0);
	expect(cssPx(screenCard.paddingRight)).toBeGreaterThan(0);
	await expect(copyButton).toBeVisible();

	await page.emulateMedia({ media: 'print' });

	await expect
		.poll(async () =>
			container.evaluate((el) => {
				const style = getComputedStyle(el);
				return {
					maxWidth: style.maxWidth,
					width: style.width,
					paddingLeft: style.paddingLeft,
					paddingRight: style.paddingRight
				};
			})
		)
		.toEqual({
			maxWidth: 'none',
			width: '500px',
			paddingLeft: '0px',
			paddingRight: '0px'
		});

	await expect
		.poll(async () =>
			firstCard.evaluate((el) => {
				const style = getComputedStyle(el);
				return {
					maxWidth: style.maxWidth,
					paddingLeft: style.paddingLeft,
					paddingRight: style.paddingRight
				};
			})
		)
		.toEqual({
			maxWidth: '100%',
			paddingLeft: '0px',
			paddingRight: '0px'
		});

	await expect
		.poll(async () =>
			figure.evaluate((el) => {
				const style = getComputedStyle(el);
				return {
					width: style.width,
					marginLeft: style.marginLeft,
					marginRight: style.marginRight
				};
			})
		)
		.toEqual({
			width: '500px',
			marginLeft: '0px',
			marginRight: '0px'
		});

	await expect
		.poll(async () =>
			chartRoot.evaluate((el) => {
				const style = getComputedStyle(el);
				return { width: style.width, maxWidth: style.maxWidth };
			})
		)
		.toEqual({ width: '500px', maxWidth: '100%' });

	const pageMargin = await page.evaluate(() => {
		for (const sheet of document.styleSheets) {
			let rules: CSSRuleList;
			try {
				rules = sheet.cssRules;
			} catch {
				continue;
			}

			for (const rule of rules) {
				if (!(rule instanceof CSSMediaRule) || !rule.conditionText.includes('print')) {
					continue;
				}

				for (const inner of rule.cssRules) {
					if (inner instanceof CSSPageRule) {
						return inner.style.margin || inner.style.getPropertyValue('margin');
					}
				}
			}
		}

		return null;
	});
	expect(pageMargin === '0' || pageMargin === '0px').toBeTruthy();

	await expect(copyButton).toBeVisible();

	const containerBox = await container.boundingBox();
	const cardBox = await firstCard.boundingBox();
	expect(containerBox).toBeTruthy();
	expect(cardBox).toBeTruthy();
	expect(containerBox!.width).toBe(500);
	expect(cardBox!.width).toBe(500);
});
