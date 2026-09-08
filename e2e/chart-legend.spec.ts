import { interpolateLab } from 'd3-interpolate';
import { schemeObservable10 } from 'd3-scale-chromatic';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { activeGraphRange } from './helpers/chart-locators';

test.use({ viewport: { width: 1400, height: 1100 } });

const csv = [
	'Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost',
	'2026-08-20T12:00:00.000Z,alpha,40,30,20,10,100,1',
	'2026-08-25T12:00:00.000Z,beta,40,30,20,10,100,2',
	'2026-08-28T12:00:00.000Z,gamma,40,30,20,10,100,3'
].join('\n');

const modelColorStops = 10;
const models = ['alpha', 'beta', 'gamma'] as const;

function expectedModelColor(index: number, length: number): string {
	const stop = Math.min(index / Math.max(length, modelColorStops), 1);
	const scaled = stop * 9;
	const k = Math.floor(scaled);
	const t = scaled % 1;

	return interpolateLab(
		schemeObservable10[k],
		schemeObservable10[(k + 1) % schemeObservable10.length]
	)(t);
}

const expectedModelColors = models.map((_, index) => expectedModelColor(index, models.length));

async function legendLabels(chart: Locator) {
	return chart
		.locator('.chart-legend li')
		.evaluateAll((items) => items.map((item) => item.textContent?.trim() ?? ''));
}

async function legendSwatchColors(chart: Locator) {
	return chart
		.locator('.chart-legend .swatch')
		.evaluateAll((swatches) => swatches.map((swatch) => getComputedStyle(swatch).backgroundColor));
}

async function expectLegendBelowPlot(chart: Locator) {
	const legendBox = await chart.locator('.chart-legend').boundingBox();
	const plotBox = await chart.locator('.lc-root-container').boundingBox();
	expect(legendBox).toBeTruthy();
	expect(plotBox).toBeTruthy();
	expect(legendBox!.y).toBeGreaterThan(plotBox!.y + plotBox!.height - 8);
}

async function loadCsv(page: Page) {
	await page.goto('/cursor_usage_analyzer/en/');
	await page.waitForLoadState('networkidle');
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(csv)
	});
}

test('daily model charts show a color legend below the plot', async ({ page }) => {
	await loadCsv(page);

	const tokensChart = page.getByRole('img', {
		name: 'Daily token count by model. 3 models, 3 days.'
	});
	const costChart = page.getByRole('img', { name: 'Daily cost by model. 3 models, 3 days.' });

	for (const chart of [tokensChart, costChart]) {
		await expect(chart).toBeVisible();
		await expect(chart.locator('.chart-legend li')).toHaveText([...models]);

		const swatches = await legendSwatchColors(chart);
		expect(swatches).toEqual(expectedModelColors);
		await expectLegendBelowPlot(chart);
	}
});

test('model breakdown charts do not show a legend', async ({ page }) => {
	await loadCsv(page);

	const tokensChart = activeGraphRange(page).getByRole('img', {
		name: 'Token count by model.',
		exact: true
	});
	const costChart = activeGraphRange(page).getByRole('img', {
		name: 'Cost by model.',
		exact: true
	});

	for (const chart of [tokensChart, costChart]) {
		await expect(chart).toBeVisible();
		await expect(chart.locator('.chart-legend')).toHaveCount(0);
	}
});

test('daily model legend follows the models still in the selected range', async ({ page }) => {
	await loadCsv(page);

	await page.getByRole('button', { name: '1 day' }).click();
	const oneDayChart = page.getByRole('img', {
		name: 'Daily token count by model. 1 models, 1 days.'
	});
	await expect(oneDayChart).toBeVisible();
	expect(await legendLabels(oneDayChart)).toEqual(['gamma']);
	expect(await legendSwatchColors(oneDayChart)).toEqual([expectedModelColors[2]]);
});
