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
			// SvelteKit 3 emits a relative redirect (`../ja`) and relative module URLs.
			// Fulfilling the post-redirect document at the pre-redirect URL makes those
			// modules resolve under the wrong path.
			if (new URL(response.url()).pathname !== new URL(route.request().url()).pathname) {
				await route.continue();
				return;
			}

			const body = (await response.text()).replace(/<html\b[^>]*>/, '<html lang="xx" dir="rtl">');
			await route.fulfill({ response, body });
		});

		await page.goto(`/cursor_usage_analyzer/${locale}/`);
		await page.waitForLoadState('networkidle');
		await expect(page.locator('html')).toHaveAttribute('lang', locale);
		await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
	});
}

test('client navigation updates html lang from Paraglide getLocale', async ({ page }) => {
	await page.goto('/cursor_usage_analyzer/en/');
	await page.waitForLoadState('networkidle');
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

	await page.evaluate(() => {
		const a = document.createElement('a');
		a.id = 'client-nav-ja';
		a.href = '/cursor_usage_analyzer/ja/';
		a.textContent = 'ja';
		document.body.appendChild(a);
	});
	await page.locator('#client-nav-ja').click();
	await expect(page).toHaveURL(/\/ja\/?$/);
	await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
	await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});
