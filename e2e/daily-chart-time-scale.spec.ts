import { expect, test, type Locator } from '@playwright/test';
import { activeChartCards } from './helpers/chart-locators';

test.use({ viewport: { width: 1280, height: 900 } });

const DAY_COUNT = 30;

function buildMonthCsv() {
	const header =
		'Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost';
	const lines = [header];

	for (let day = 0; day < DAY_COUNT; day += 1) {
		const date = new Date(Date.UTC(2026, 7, 1 + day, 12, 0, 0)).toISOString();
		const tokens = 1000 + day * 100;
		lines.push(`${date},alpha,0,0,0,${tokens},${tokens},${(day + 1).toFixed(2)}`);
	}

	return lines.join('\n');
}

async function bottomAxisLabels(chart: Locator) {
	return chart.evaluate((element) => {
		const labels = [
			...element.querySelectorAll('.lc-axis.placement-bottom text.lc-axis-tick-label')
		];

		return labels.map((label) => {
			const box = label.getBoundingClientRect();
			return { text: label.textContent?.trim() ?? '', left: box.left, right: box.right };
		});
	});
}

test('daily charts use a month-sized time scale with spaced date ticks', async ({ page }) => {
	await page.goto('/cursor_usage_analyzer/en/');
	await page.waitForLoadState('networkidle');
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(buildMonthCsv())
	});

	await expect(page.getByText(/records loaded/)).toBeVisible();
	const tokensChart = page.getByRole('img', {
		name: `Daily token count by model. 1 models, ${DAY_COUNT} days.`
	});
	const costChart = page.getByRole('img', {
		name: `Daily cost by model. 1 models, ${DAY_COUNT} days.`
	});
	await expect(tokensChart).toBeVisible();
	await expect(costChart).toBeVisible();
	await expect(tokensChart.locator('.lc-bar, .lc-bars')).not.toHaveCount(0);

	for (const chart of [tokensChart, costChart]) {
		const ticks = await bottomAxisLabels(chart);
		expect(ticks.length).toBeGreaterThan(1);
		expect(ticks.length).toBeLessThan(DAY_COUNT);

		for (let index = 1; index < ticks.length; index += 1) {
			expect(ticks[index].left).toBeGreaterThan(ticks[index - 1].right);
		}
	}

	await tokensChart.locator('.lc-tooltip-rect').first().hover();
	const tooltip = page.locator('.lc-tooltip-root:not([inert])');
	await expect(tooltip).toBeVisible();
	await expect(tooltip.locator('.lc-tooltip-header')).toHaveText('Aug 1');

	const cards = activeChartCards(page);
	await expect(cards.nth(0).locator('figcaption strong')).toHaveText(
		'Token count (by model) / day'
	);
	await expect(cards.nth(1).locator('figcaption strong')).toHaveText('Cost (by model) / day');
});
