import { expect, test } from '@playwright/test';

for (const locale of ['ja', 'en'] as const) {
	test(`client updates html lang to ${locale} after a wrong prerendered value`, async ({
		page
	}) => {
		await page.route('**/*', async (route) => {
			if (route.request().resourceType() !== 'document') {
				await route.continue();
				return;
			}

			const response = await route.fetch();
			const body = (await response.text()).replace(/<html\b[^>]*>/, '<html lang="xx" dir="rtl">');
			await route.fulfill({ response, body });
		});

		await page.goto(`/cursor_usage_analyzer/${locale}/`);
		await page.waitForLoadState('networkidle');
		await expect(page.locator('html')).toHaveAttribute('lang', locale);
		await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
	});
}
