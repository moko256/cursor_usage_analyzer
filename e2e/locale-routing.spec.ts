import { expect, test } from '@playwright/test';

test('ルートパスは英語で表示される', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveTitle('CSV Cost Analysis');
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await expect(page.getByText('Select a CSV file')).toBeVisible();
});

test('/ja は日本語で表示される', async ({ page }) => {
	await page.goto('/ja');

	await expect(page).toHaveTitle('CSVコスト分析');
	await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
	await expect(page.getByText('CSVを選択')).toBeVisible();
});

test('/ja のロケールはハイドレーション後も維持される', async ({ page }) => {
	await page.goto('/ja');
	await page.waitForLoadState('networkidle');

	await expect(page.getByText('CSVを選択')).toBeVisible();
	await expect(page.getByText('Select a CSV file')).toHaveCount(0);
});
