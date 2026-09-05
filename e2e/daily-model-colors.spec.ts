import { interpolateLab, interpolateRgb } from 'd3-interpolate';
import { interpolatePuBu, schemeObservable10 } from 'd3-scale-chromatic';
import { expect, test, type Locator } from '@playwright/test';

test.use({ viewport: { width: 1400, height: 1100 } });

const csv = [
	'Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost',
	'2026-08-20T12:00:00.000Z,alpha,40,30,20,10,100,1',
	'2026-08-25T12:00:00.000Z,beta,40,30,20,10,100,2',
	'2026-08-28T12:00:00.000Z,gamma,40,30,20,10,100,3'
].join('\n');

const modelCount = 3;
const tokenCount = 4;
const modelColorStops = 10;

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

const expectedModelColors = [0, 1, 2].map((index) => expectedModelColor(index, modelCount));
const expectedTokenStart = interpolatePuBu(0.2);

async function nonzeroBarFills(chart: Locator) {
	await expect(chart.locator('.lc-bar, .lc-bars')).not.toHaveCount(0);

	return chart.evaluate((element) =>
		[...element.querySelectorAll('.lc-bar, .lc-bars-bar, .lc-bars path, .lc-bars rect')]
			.map((bar) => {
				const box = (bar as SVGGraphicsElement).getBBox();
				const fill =
					bar.getAttribute('fill') || (bar as SVGElement).style.fill || getComputedStyle(bar).fill;

				return { fill, x: box.x, y: box.y, height: box.height, width: box.width };
			})
			.filter((bar) => bar.height > 1 && bar.width > 1)
	);
}

async function tooltipSwatches(tooltip: Locator) {
	return tooltip.locator('.lc-tooltip-item-color').evaluateAll((dots) =>
		dots.map((dot) => {
			const style = getComputedStyle(dot);

			return {
				color: style.getPropertyValue('--color').trim(),
				background: style.backgroundColor
			};
		})
	);
}

test('daily model colors stay stable when a shorter range drops other models', async ({ page }) => {
	await page.goto('/cursor_usage_analyzer/en/');
	await page.waitForLoadState('networkidle');
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(csv)
	});

	const tokensChart = page.getByRole('img', { name: 'Daily tokens by model. 3 models, 3 days.' });
	await expect(tokensChart).toBeVisible();

	const allTimeFills = (await nonzeroBarFills(tokensChart)).sort((left, right) => left.x - right.x);
	expect(allTimeFills).toHaveLength(3);
	expect(allTimeFills.map((bar) => bar.fill)).toEqual(expectedModelColors);

	await page.getByRole('button', { name: '1 day' }).click();
	const oneDayChart = page.getByRole('img', { name: 'Daily tokens by model. 1 models, 1 days.' });
	await expect(oneDayChart).toBeVisible();

	const oneDayFills = await nonzeroBarFills(oneDayChart);
	expect(oneDayFills).toHaveLength(1);
	expect(oneDayFills[0]?.fill).toBe(allTimeFills[2]?.fill);
	expect(oneDayFills[0]?.fill).toBe(expectedModelColors[2]);
	expect(oneDayFills[0]?.fill).not.toBe(allTimeFills[0]?.fill);
});

test('token breakdown gradients from interpolatePuBu(0.2) to each model Observable10 color', async ({
	page
}) => {
	await page.goto('/cursor_usage_analyzer/en/');
	await page.waitForLoadState('networkidle');
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(csv)
	});

	const breakdownChart = page.getByRole('img', {
		name: 'Tokens by model. Bars increase from left to right.'
	});
	await expect(breakdownChart).toBeVisible();

	const fills = await nonzeroBarFills(breakdownChart);
	const rows = Map.groupBy(fills, (bar) => Math.round(bar.y));
	const modelRows = [...rows.values()]
		.filter((row) => row.length >= tokenCount)
		.sort((left, right) => left[0].y - right[0].y)
		.map((row) => [...row].sort((left, right) => left.x - right.x).map((bar) => bar.fill));

	expect(modelRows).toHaveLength(modelCount);

	for (const [modelIndex, row] of modelRows.entries()) {
		const mix = interpolateRgb(expectedTokenStart, expectedModelColors[modelIndex]);

		expect(row[0]).toBe(mix(0));
		expect(row[tokenCount - 1]).toBe(mix(1));
		expect(row[tokenCount - 1]).toBe(expectedModelColors[modelIndex]);
	}
});

test('daily model tooltip shows a color swatch for each model that day', async ({ page }) => {
	const tooltipCsv = [
		'Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost',
		'2026-08-20T12:00:00.000Z,alpha,40,30,20,10,100,1',
		'2026-08-20T12:00:00.000Z,beta,40,30,20,10,200,2',
		'2026-08-25T12:00:00.000Z,gamma,40,30,20,10,300,3'
	].join('\n');

	await page.goto('/cursor_usage_analyzer/en/');
	await page.waitForLoadState('networkidle');
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(tooltipCsv)
	});

	const tokensChart = page.getByRole('img', { name: 'Daily tokens by model. 3 models, 2 days.' });
	const costChart = page.getByRole('img', { name: 'Daily cost by model. 3 models, 2 days.' });
	await expect(tokensChart).toBeVisible();
	await expect(costChart).toBeVisible();

	const stackedExpected = [expectedModelColors[0], expectedModelColors[1]];
	const singleExpected = [expectedModelColors[2]];

	for (const [chartIndex, chart] of [tokensChart, costChart].entries()) {
		const tooltipRects = chart.locator('.lc-tooltip-rect');
		await expect(tooltipRects).toHaveCount(2);
		const isTokens = chartIndex === 0;

		await tooltipRects.nth(0).hover();
		const stackedTooltip = page.locator('.lc-tooltip-root:not([inert])');
		await expect(stackedTooltip).toBeVisible();
		await expect(stackedTooltip.locator('.lc-tooltip-header')).toHaveText('Aug 20');
		await expect(stackedTooltip.locator('.lc-tooltip-item-label')).toHaveText(['alpha', 'beta']);
		await expect(stackedTooltip.locator('.lc-tooltip-item-value')).toHaveText(
			isTokens ? ['100', '200'] : ['$1.00', '$2.00']
		);
		await expect(stackedTooltip.locator('.lc-tooltip-item-color')).toHaveCount(2);
		const stackedSwatches = await tooltipSwatches(stackedTooltip);
		expect(stackedSwatches.map((swatch) => swatch.color)).toEqual(stackedExpected);
		expect(stackedSwatches.map((swatch) => swatch.background)).not.toContain('rgba(0, 0, 0, 0)');

		await tooltipRects.nth(1).hover();
		const singleTooltip = page.locator('.lc-tooltip-root:not([inert])');
		await expect(singleTooltip).toBeVisible();
		await expect(singleTooltip.locator('.lc-tooltip-header')).toHaveText('Aug 25');
		await expect(singleTooltip.locator('.lc-tooltip-item-label')).toHaveText(['gamma']);
		await expect(singleTooltip.locator('.lc-tooltip-item-value')).toHaveText(
			isTokens ? ['300'] : ['$3.00']
		);
		await expect(singleTooltip.locator('.lc-tooltip-item-color')).toHaveCount(1);
		const singleSwatches = await tooltipSwatches(singleTooltip);
		expect(singleSwatches.map((swatch) => swatch.color)).toEqual(singleExpected);
		expect(singleSwatches.map((swatch) => swatch.background)).not.toContain('rgba(0, 0, 0, 0)');
	}
});

test('10 models sample distinct Observable10 Lab colors', async ({ page }) => {
	const paletteCount = 10;
	const paletteCsv = [
		'Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost',
		...Array.from(
			{ length: paletteCount },
			(_, index) => `2026-08-20T12:00:00.000Z,model-${index},40,30,20,10,100,${index + 1}`
		)
	].join('\n');

	await page.goto('/cursor_usage_analyzer/en/');
	await page.waitForLoadState('networkidle');
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(paletteCsv)
	});

	const tokensChart = page.getByRole('img', {
		name: 'Daily tokens by model. 10 models, 1 days.'
	});
	await expect(tokensChart).toBeVisible();

	const fills = [...new Set((await nonzeroBarFills(tokensChart)).map((bar) => bar.fill))];
	const expected = Array.from({ length: paletteCount }, (_, index) =>
		expectedModelColor(index, paletteCount)
	);

	expect(fills).toHaveLength(paletteCount);
	expect(new Set(fills)).toEqual(new Set(expected));
});
