import { expect, test } from '@playwright/test';
import { buildManyRowCsv, setCsvInputFiles } from './helpers/csv-upload';

test('パース中はprogressがdeterminateになり完了後に消える', async ({ page }) => {
	await page.goto('/cursor_usage_analyzer/ja/');
	await page.waitForLoadState('networkidle');

	const csv = buildManyRowCsv(50_000);
	const determinate = page.waitForFunction(() => {
		const bar = document.querySelector('progress');
		if (!bar?.hasAttribute('max') || !bar.hasAttribute('value')) return false;
		return Number(bar.getAttribute('value')) < Number(bar.getAttribute('max'));
	});

	await setCsvInputFiles(page, csv);

	await determinate;
	const progress = page.locator('progress');
	await expect(progress).toHaveAttribute('max');
	await expect(progress).toHaveAttribute('value');
	const max = Number(await progress.getAttribute('max'));
	const value = Number(await progress.getAttribute('value'));
	expect(max).toBeGreaterThan(0);
	expect(value).toBeGreaterThanOrEqual(0);
	expect(value).toBeLessThan(max);

	await expect(page.getByText('50000件を読み込みました')).toBeVisible({ timeout: 60_000 });
	await expect(progress).toHaveCount(0);
	await expect(page.locator('.chart-card').first()).toBeVisible();
});
