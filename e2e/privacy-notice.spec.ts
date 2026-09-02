import { expect, test } from '@playwright/test';

test.use({ video: 'on' });

const sensitiveColumns = ['Cloud Agent ID', 'Automation ID', 'User'];

for (const locale of ['ja', 'en'] as const) {
	test(`privacy notice lists columns to remove before upload (${locale})`, async ({ page }) => {
		await page.goto(`/cursor_usage_analyzer/${locale}/`);
		await page.waitForLoadState('networkidle');

		for (const column of sensitiveColumns) {
			await expect(page.locator('code', { hasText: column })).toBeVisible();
		}
	});
}
