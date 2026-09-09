import { interpolatePuBu } from 'd3-scale-chromatic';
import { expect, test, type Locator } from '@playwright/test';
import {
	activeChartCards,
	activeLocator,
	sundayPaddedMonthDayCount
} from './helpers/chart-locators';

const today = new Date();
const chartMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
const csv = [
	'Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost',
	`${chartMonthStart.toISOString()},claude-4.5-sonnet-thinking,0,0,0,0,120000,1.42`,
	`${new Date(chartMonthStart.getTime() + 86_400_000).toISOString()},gpt-5.6-luna-high,0,0,0,0,80000,0.92`,
	`${new Date(chartMonthStart.getTime() + 2 * 86_400_000).toISOString()},composer-2.5,0,0,0,0,30000,0.15`
].join('\n');

const breakdownCsv = [
	'Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost',
	'2026-08-25T10:00:00.000Z,alpha,0,20,0,80,100,1.00'
].join('\n');

const zeroTokenCalendarCsv = [
	'Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost',
	`${new Date(chartMonthStart.getTime() + 86_400_000).toISOString()},alpha,0,0,0,100,100,1.00`
].join('\n');

/** Two bins: 100 tokens → stop 0.25, 100000 tokens → stop 1 (max). */
const heatmapCalendarCsv = [
	'Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost',
	`${chartMonthStart.toISOString()},alpha,0,0,0,0,100,1`,
	`${new Date(chartMonthStart.getTime() + 86_400_000).toISOString()},alpha,0,0,0,0,100000,1`
].join('\n');

const models = ['claude-4.5-sonnet-thinking', 'gpt-5.6-luna-high', 'composer-2.5'];

/**
 * A tick label is laid out relative both to the nested `<svg>` LayerChart wraps it in and to the
 * chart's outer `<svg>`, and both of those clip. A clipped label is still in the DOM and still passes
 * Playwright's visibility check, so compare the boxes instead.
 */
async function uniqueBarFills(card: Locator) {
	return card.locator('.lc-bar').evaluateAll((bars) => {
		const byFill = new Map<string, { fill: string; computed: string }>();

		for (const bar of bars) {
			const fill = bar.getAttribute('fill') ?? '';
			if (!fill || fill === 'none') continue;
			if (!byFill.has(fill)) {
				byFill.set(fill, { fill, computed: getComputedStyle(bar).fill });
			}
		}

		return [...byFill.values()];
	});
}

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

	await expect(activeChartCards(page)).toHaveCount(6);
});

test('モデル別グラフの色が d3-scale-chromatic で割り当てられる', async ({ page }) => {
	const dailyFills = await uniqueBarFills(activeChartCards(page).nth(0));
	expect(dailyFills.length).toBeGreaterThanOrEqual(models.length);
	expect(new Set(dailyFills.map((item) => item.computed)).size).toBe(dailyFills.length);

	await page.locator('input[type="file"]').setInputFiles({
		name: 'breakdown.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(breakdownCsv)
	});
	await expect(activeChartCards(page)).toHaveCount(6);

	const breakdownCard = activeLocator(page, '.chart-card.horizontal-card').nth(0);
	await expect(breakdownCard.locator('.lc-bar')).not.toHaveCount(0);

	const breakdownFills = await uniqueBarFills(breakdownCard);
	expect(breakdownFills.length).toBeGreaterThan(1);
	expect(new Set(breakdownFills.map((item) => item.computed)).size).toBe(breakdownFills.length);
});

test('モデル別の日次グラフが先頭に並ぶ', async ({ page }) => {
	const cards = activeChartCards(page);

	await expect(cards.nth(0).locator('figcaption strong')).toHaveText(
		'Token count (by model) / day'
	);
	await expect(cards.nth(0).locator('[role="img"]')).toHaveAttribute(
		'aria-label',
		/Daily token count by model/
	);
	await expect(cards.nth(1).locator('figcaption strong')).toHaveText('Cost (by model) / day');
	await expect(cards.nth(1).locator('[role="img"]')).toHaveAttribute(
		'aria-label',
		/Daily cost by model/
	);
});

test('トークン軸の目盛りラベルがSI接頭辞で丸められる', async ({ page }) => {
	const cards = activeChartCards(page);
	const dailyTokenLabels = await cards.nth(0).locator('text.lc-axis-tick-label').allTextContents();
	const modelTokenLabels = await cards.nth(2).locator('text.lc-axis-tick-label').allTextContents();

	expect(dailyTokenLabels.some((label) => /^\d+[kMGT]$/.test(label))).toBe(true);
	expect(modelTokenLabels.some((label) => /^\d+[kMGT]$/.test(label))).toBe(true);
	expect(dailyTokenLabels.some((label) => /^\d{4,}$/.test(label))).toBe(false);
	expect(modelTokenLabels.some((label) => /^\d{4,}$/.test(label))).toBe(false);
});

test('コスト軸の目盛りラベルがドル付きで揃う', async ({ page }) => {
	const cards = activeChartCards(page);
	const dailyCostLabels = await cards.nth(1).locator('text.lc-axis-tick-label').allTextContents();
	const modelCostLabels = await cards.nth(3).locator('text.lc-axis-tick-label').allTextContents();

	expect(dailyCostLabels.some((label) => label.startsWith('$'))).toBe(true);
	expect(modelCostLabels.some((label) => label.startsWith('$'))).toBe(true);
});

test('tokenカレンダーがグラフグリッドに並ぶ', async ({ page }) => {
	const calendar = activeLocator(page, '.calendar-card');

	await expect(activeChartCards(page)).toHaveCount(6);
	await expect(page.locator('.calendar-group')).toHaveCount(0);
	await expect(calendar).toHaveCount(1);
	await expect(calendar.locator('figcaption strong')).toHaveText('Token count calendar');
	await expect(calendar.locator('.lc-rect')).toHaveCount(
		sundayPaddedMonthDayCount(chartMonthStart)
	);

	const week = await calendar.locator('.lc-rect').evaluateAll((elements) =>
		elements.slice(0, 8).map((element) => {
			const box = element.getBoundingClientRect();
			return { left: box.left, top: box.top };
		})
	);
	expect(week).toHaveLength(8);
	for (let index = 1; index < 7; index += 1) {
		expect(week[index]?.left).toBeCloseTo(week[0]?.left ?? 0, 0);
		expect(week[index]?.top ?? 0).toBeGreaterThan(week[index - 1]?.top ?? 0);
	}
	expect(week[7]?.left ?? 0).toBeGreaterThan(week[0]?.left ?? 0);
	expect(week[7]?.top).toBeCloseTo(week[0]?.top ?? 0, 0);

	const edgeCells = await calendar.locator('.lc-rect').evaluateAll((elements) => {
		const svg = elements[0]?.closest('svg');
		const svgBox = svg?.getBoundingClientRect();

		return [elements[0], elements.at(-2), elements.at(-1)].map((element) => {
			const box = element?.getBoundingClientRect();
			return {
				left: box?.left ?? 0,
				right: box?.right ?? 0,
				top: box?.top ?? 0,
				bottom: box?.bottom ?? 0,
				insideSvg:
					!!svgBox &&
					(box?.left ?? 0) >= svgBox.left &&
					(box?.right ?? 0) <= svgBox.right &&
					(box?.top ?? 0) >= svgBox.top &&
					(box?.bottom ?? 0) <= svgBox.bottom
			};
		});
	});
	expect(edgeCells).toHaveLength(3);
	expect(edgeCells.every((cell) => cell.insideSvg)).toBe(true);

	const hourly = activeLocator(page, '.hourly-token-card');
	await expect(hourly).toHaveCount(1);
	await expect(hourly.locator('figcaption strong')).toHaveText('Token count / time of day');
	await expect(hourly.locator('[role="img"]')).toHaveAttribute(
		'aria-label',
		'Token count by time of day.'
	);
	await expect(hourly.locator('.lc-bar')).toHaveCount(24);

	const hourlyLabels = await hourly.locator('text.lc-axis-tick-label').allTextContents();
	expect(hourlyLabels.filter((label) => /^\d{2}:00$/.test(label))).toEqual([
		'00:00',
		'03:00',
		'06:00',
		'09:00',
		'12:00',
		'15:00',
		'18:00',
		'21:00'
	]);
});

for (const colorScheme of ['light', 'dark'] as const) {
	test.describe(`tokenカレンダーの0トークン色 (${colorScheme})`, () => {
		test.use({ colorScheme });

		test('0トークンのセルはカレンダーのフォールバック色を使う', async ({ page }) => {
			await page.locator('input[type="file"]').setInputFiles({
				name: 'zero-token-calendar.csv',
				mimeType: 'text/csv',
				buffer: Buffer.from(zeroTokenCalendarCsv)
			});

			const calendar = activeLocator(page, '.calendar-card');
			await expect(calendar.locator('.lc-rect')).toHaveCount(
				sundayPaddedMonthDayCount(chartMonthStart)
			);

			const cells = await calendar.locator('.lc-rect').evaluateAll((elements) =>
				elements.map((element) => ({
					fill: element.getAttribute('fill'),
					computedFill: getComputedStyle(element).fill
				}))
			);
			const empty = cells.find((cell) => cell.fill === null);
			const filled = cells.find((cell) => cell.fill !== null);

			expect(empty).toEqual({
				fill: null,
				computedFill: colorScheme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)'
			});
			expect(filled?.fill).not.toBeNull();
			expect(filled?.computedFill).not.toBe(empty?.computedFill);
		});
	});

	test.describe(`tokenカレンダーのヒート色 (${colorScheme})`, () => {
		test.use({ colorScheme });

		test('トークン数が多いセルはライトモードで暗く、ダークモードで明るくなる', async ({ page }) => {
			await page.locator('input[type="file"]').setInputFiles({
				name: 'heatmap-calendar.csv',
				mimeType: 'text/csv',
				buffer: Buffer.from(heatmapCalendarCsv)
			});

			const calendar = activeLocator(page, '.calendar-card');
			await expect(calendar.locator('.lc-rect')).toHaveCount(
				sundayPaddedMonthDayCount(chartMonthStart)
			);

			const fills = [
				...new Set(
					await calendar.locator('.lc-rect').evaluateAll((elements) =>
						elements
							.map((element) => {
								if (!element.getAttribute('fill')) return null;
								return getComputedStyle(element).fill;
							})
							.filter((fill): fill is string => fill !== null)
					)
				)
			];

			const lowStop = 0.25;
			const highStop = 1;
			const expectedLow = interpolatePuBu(colorScheme === 'dark' ? 1 - lowStop : lowStop);
			const expectedHigh = interpolatePuBu(colorScheme === 'dark' ? 1 - highStop : highStop);

			expect(fills).toEqual(expect.arrayContaining([expectedLow, expectedHigh]));
		});
	});
}

test('横棒グラフの軸にモデル名が描画される', async ({ page }) => {
	const cards = await activeLocator(page, '.chart-card.horizontal-card').all();
	expect(cards).toHaveLength(2);

	for (const card of cards) {
		const painted = (await readTickLabels(card))
			.filter((label) => label.clippedBy.length === 0)
			.map((label) => label.text);

		expect(painted).toEqual(expect.arrayContaining(models));
	}
});

test('長いモデル名は軸で折り返し、ツールチップでは全文を出す', async ({ page }) => {
	const longModel = 'an-unusually-long-model-identifier';
	await page.locator('input[type="file"]').setInputFiles({
		name: 'long-model.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(
			[
				'Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost',
				`2026-08-25T10:00:00.000Z,${longModel},0,20,0,80,100,1.00`
			].join('\n')
		)
	});
	await expect(page.getByText(/records loaded/)).toBeVisible();
	await expect(activeChartCards(page)).toHaveCount(6);

	const cards = activeLocator(page, '.chart-card.horizontal-card');
	await expect(
		cards.first().locator('text.lc-axis-tick-label', { hasText: longModel })
	).toBeVisible();
	await expect(cards).toHaveCount(2);

	for (const card of await cards.all()) {
		const painted = (await readTickLabels(card))
			.filter((label) => label.clippedBy.length === 0)
			.map((label) => label.text);

		expect(painted).toContain(longModel);
		expect(painted.some((text) => text.includes('...'))).toBe(false);

		const tspanCount = await card
			.locator('text.lc-axis-tick-label', { hasText: longModel })
			.locator('tspan')
			.count();
		expect(tspanCount).toBeGreaterThan(1);
	}

	await cards.nth(0).locator('.lc-tooltip-rect').hover();
	const tooltip = page.locator('.lc-tooltip-root:not([inert])');
	await expect(tooltip).toBeVisible();
	await expect(tooltip.locator('.lc-tooltip-header')).toHaveText(longModel);
});

test('軸の目盛りラベルが切り取られない', async ({ page }) => {
	const cards = await activeLocator(page, '.chart-card:not(.calendar-card)').all();

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

	const cards = activeLocator(page, '.chart-card.horizontal-card');
	await expect(cards).toHaveCount(2);

	for (const [index, card] of (await cards.all()).entries()) {
		await card.locator('.lc-tooltip-rect').hover();

		const tooltip = page.locator('.lc-tooltip-root:not([inert])');
		await expect(tooltip).toBeVisible();
		await expect(tooltip.locator('.lc-tooltip-item-label')).toHaveText([
			'Input (w/ Cache Write)',
			'Input (w/o Cache Write)',
			'Cache Read',
			'Output Tokens',
			'Total'
		]);
		await expect(tooltip.locator('.lc-tooltip-item-value')).toHaveText([
			index === 0 ? '0' : '$0.00',
			index === 0 ? '20' : '$0.20',
			index === 0 ? '0' : '$0.00',
			index === 0 ? '80' : '$0.80',
			index === 0 ? '100' : '$1.00'
		]);
	}
});
