import { expect, test } from '@playwright/test';

test('CSVファイルを添付すると解析結果が表示される', async ({ page }) => {
	await page.goto('/cursor_usage_analyzer/ja/');

	await page.waitForLoadState('networkidle');
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(
			[
				'Date,Model,Total Tokens,Cost',
				'2026-08-28T17:00:00.000Z,gpt-5.6-luna-high,1234,12.34'
			].join('\n')
		)
	});

	await expect(page.getByText('1件を読み込みました')).toBeVisible();
	await expect(page.locator('section > strong').nth(0)).toHaveText('On-demand使用料: $12.3');
	await expect(page.locator('section > strong').nth(1)).toHaveText('合計トークン数: 1,234');
});

test('非CSVを選ぶとエラーになりグラフが消える', async ({ page }) => {
	await page.goto('/cursor_usage_analyzer/ja/');
	await page.waitForLoadState('networkidle');

	const fileInput = page.locator('input[type="file"]');
	await fileInput.setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from('Date,Model,Total Tokens,Cost\n2026-08-28T17:00:00.000Z,alpha,10,1\n')
	});
	await expect(page.locator('.chart-card')).toHaveCount(6);

	await fileInput.setInputFiles({
		name: 'notes.txt',
		mimeType: 'text/plain',
		buffer: Buffer.from('not a csv')
	});

	await expect(page.getByRole('alert')).toHaveText('CSVファイルを選択してください。');
	await expect(page.locator('.chart-card')).toHaveCount(0);
});
