import { interpolateRgb } from 'd3-interpolate';
import { interpolatePuBu, interpolateTurbo } from 'd3-scale-chromatic';
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
const expectedModelColors = [0, 1, 2].map((index) =>
	interpolateTurbo(Math.min(index / Math.max(modelCount, 15), 1))
);
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

test('token breakdown gradients from interpolatePuBu(0.2) to each model turbo color', async ({
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
