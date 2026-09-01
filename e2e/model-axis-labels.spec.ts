import { expect, test, type Locator } from '@playwright/test';

const csv = [
	'Date,Model,Total Tokens,Cost',
	'2026-08-25T10:00:00.000Z,claude-4.5-sonnet-thinking,120000,1.42',
	'2026-08-25T11:00:00.000Z,gpt-5.6-luna-high,80000,0.92',
	'2026-08-27T12:00:00.000Z,composer-2.5,30000,0.15'
].join('\n');

const breakdownCsv = [
	'Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost',
	'2026-08-25T10:00:00.000Z,alpha,0,20,0,80,100,1.00'
].join('\n');

const models = ['claude-4.5-sonnet-thinking', 'gpt-5.6-luna-high', 'composer-2.5'];

/**
 * A tick label is laid out relative both to the nested `<svg>` LayerChart wraps it in and to the
 * chart's outer `<svg>`, and both of those clip. A clipped label is still in the DOM and still passes
 * Playwright's visibility check, so compare the boxes instead.
 */
async function readTickLabels(card: Locator) {
	return card.evaluate((element) => {
		const chart = element.querySelector('svg.lc-layout-svg')!.getBoundingClientRect();

		return [...element.querySelectorAll('text.lc-axis-tick-label')].map((label) => {
			const nested = label.closest('svg.lc-text-svg');
			const box = label.getBoundingClientRect();
			const clippedBy = [];

			if (nested && getComputedStyle(nested).overflow !== 'visible') clippedBy.push('nested svg');
			if (box.left < chart.left - 1 || box.right > chart.right + 1) clippedBy.push('chart svg');

			return { text: label.textContent ?? '', clippedBy };
		});
	});
}

test.beforeEach(async ({ page }) => {
	await page.goto('/cursor_usage_analyzer/en/');
	await page.waitForLoadState('networkidle');
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(csv)
	});

	await expect(page.locator('.chart-card')).toHaveCount(5);
});

test('モデル別の日次グラフが先頭に並ぶ', async ({ page }) => {
	const cards = page.locator('.chart-card');

	await expect(cards.nth(0).locator('figcaption strong')).toHaveText('Tokens / model / day');
	await expect(cards.nth(0).locator('[role="img"]')).toHaveAttribute(
		'aria-label',
		/Daily tokens by model/
	);
	await expect(cards.nth(1).locator('figcaption strong')).toHaveText('Cost / model / day');
	await expect(cards.nth(1).locator('[role="img"]')).toHaveAttribute(
		'aria-label',
		/Daily cost by model/
	);
});

test('tokenカレンダーがグラフグリッドに並ぶ', async ({ page }) => {
	const group = page.locator('.graph-group');
	const calendar = group.locator('.calendar-card');

	await expect(group.locator('.chart-card')).toHaveCount(5);
	await expect(page.locator('.calendar-group')).toHaveCount(0);
	await expect(calendar).toHaveCount(1);
	await expect(calendar.locator('.lc-rect')).toHaveCount(371);
});

test('横棒グラフの軸にモデル名が描画される', async ({ page }) => {
	const cards = await page.locator('.chart-card.horizontal-card').all();
	expect(cards).toHaveLength(2);

	for (const card of cards) {
		const painted = (await readTickLabels(card))
			.filter((label) => label.clippedBy.length === 0)
			.map((label) => label.text);

		expect(painted).toEqual(expect.arrayContaining(models));
	}
});

test('軸の目盛りラベルが切り取られない', async ({ page }) => {
	const cards = await page.locator('.chart-card:not(.calendar-card):not(.empty-card)').all();

	for (const card of cards) {
		const labels = await readTickLabels(card);

		expect(labels.length).toBeGreaterThan(0);
		expect(labels.filter((label) => label.clippedBy.length > 0)).toEqual([]);
	}
});

test('モデル別ツールチップに0のトークン内訳とコスト内訳を表示する', async ({ page }) => {
	await page.locator('input[type="file"]').setInputFiles({
		name: 'breakdown.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(breakdownCsv)
	});

	const cards = page.locator('.chart-card.horizontal-card');
	await expect(cards).toHaveCount(2);

	for (const [index, card] of (await cards.all()).entries()) {
		await card.locator('.lc-tooltip-rect').hover();

		const tooltip = page.locator('.lc-tooltip-root:not([inert])');
		await expect(tooltip).toBeVisible();
		await expect(tooltip.locator('.lc-tooltip-item-label')).toHaveText([
			'Input (w/ Cache Write)',
			'Input (w/o Cache Write)',
			'Cache Read',
			'Output Tokens'
		]);
		await expect(tooltip.locator('.lc-tooltip-item-value')).toHaveText([
			index === 0 ? '0' : '$0.00',
			index === 0 ? '20' : '$0.20',
			index === 0 ? '0' : '$0.00',
			index === 0 ? '80' : '$0.80'
		]);
	}
});
