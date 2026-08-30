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
	await expect(page.locator('section > strong')).toHaveText('On-demand使用料: $12.3');
});
