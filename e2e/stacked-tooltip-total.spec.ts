import { expect, test } from '@playwright/test';
import { activeGraphRange } from './helpers/chart-locators';

const csv = [
	'Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost',
	'2026-08-20T12:00:00.000Z,alpha,40,30,20,10,100,1',
	'2026-08-20T12:00:00.000Z,beta,80,60,40,20,200,2'
].join('\n');

test('積み上げグラフのツールチップにバー合計を表示する', async ({ page }) => {
	await page.goto('/cursor_usage_analyzer/ja/');
	await page.waitForLoadState('networkidle');
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(csv)
	});

	const tokensChart = page.getByRole('img', {
		name: 'モデル別の日次トークン数。2モデル、1日分。'
	});
	await expect(tokensChart).toBeVisible();
	await tokensChart.locator('.lc-tooltip-rect').hover();

	const tooltip = page.locator('.lc-tooltip-root:not([inert])');
	await expect(tooltip).toBeVisible();
	await expect(tooltip.locator('.lc-tooltip-item-label')).toHaveText(['alpha', 'beta', '合計']);
	await expect(tooltip.locator('.lc-tooltip-item-value')).toHaveText(['100', '200', '300']);

	const costChart = page.getByRole('img', {
		name: 'モデル別の日次コスト。2モデル、1日分。'
	});
	await costChart.locator('.lc-tooltip-rect').hover();
	await expect(tooltip.locator('.lc-tooltip-item-label')).toHaveText(['alpha', 'beta', '合計']);
	await expect(tooltip.locator('.lc-tooltip-item-value')).toHaveText(['$1.00', '$2.00', '$3.00']);

	const breakdownChart = activeGraphRange(page).getByRole('img', {
		name: 'モデルごとのトークン数。',
		exact: true
	});
	await breakdownChart.locator('.lc-tooltip-rect').first().hover();
	await expect(tooltip.locator('.lc-tooltip-item-label')).toHaveText([
		'Input (w/ Cache Write)',
		'Input (w/o Cache Write)',
		'Cache Read',
		'Output Tokens',
		'合計'
	]);
	await expect(tooltip.locator('.lc-tooltip-item-value')).toHaveText([
		'40',
		'30',
		'20',
		'10',
		'100'
	]);
});
