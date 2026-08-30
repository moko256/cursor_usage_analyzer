import { expect, test, type Locator } from '@playwright/test';

const csv = [
	'Date,Model,Total Tokens,Cost',
	'2026-08-25T10:00:00.000Z,claude-4.5-sonnet-thinking,120000,1.42',
	'2026-08-25T11:00:00.000Z,gpt-5.6-luna-high,80000,0.92',
	'2026-08-27T12:00:00.000Z,composer-2.5,30000,0.15'
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
	await page.goto('/');
	await page.waitForLoadState('networkidle');
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(csv)
	});

	await expect(page.locator('.chart-card')).toHaveCount(6);
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

test('tokenカレンダーと空のカードが7対3で並ぶ', async ({ page }) => {
	const group = page.locator('.calendar-group');
	const cards = group.locator('.chart-card');
	const calendar = cards.nth(0);

	await expect(cards).toHaveCount(2);
	await expect(calendar.locator('figcaption strong')).toHaveText('');
	await expect(calendar.locator('figcaption span')).toHaveText('');
	await expect(calendar.locator('.lc-rect')).toHaveCount(371);

	const widths = await cards.evaluateAll((elements) =>
		elements.map((element) => element.getBoundingClientRect().width)
	);
	expect(widths[0]).toBeGreaterThan((widths[1] ?? 0) * 2);
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
