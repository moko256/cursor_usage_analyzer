import { expect, test } from '@playwright/test';

const csv = [
	'Date,Model,Total Tokens,Cost',
	'2026-08-25T10:00:00.000Z,claude-4.5-sonnet-thinking,120000,1.42',
	'2026-08-26T11:00:00.000Z,gpt-5.6-luna-high,80000,0.92',
	'2026-08-27T12:00:00.000Z,composer-2.5,30000,0.15'
].join('\n');

test('グラフのcopyボタンで画像をクリップボードにコピーできる', async ({ page }) => {
	await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto('/');
	await page.waitForLoadState('networkidle');
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(csv)
	});

	await expect(page.locator('.chart-card')).toHaveCount(6);
	await expect(page.getByRole('button', { name: 'copy' })).toHaveCount(6);

	await page.getByRole('button', { name: 'copy' }).first().click();

	await expect
		.poll(() =>
			page.evaluate(async () => {
				const [item] = await navigator.clipboard.read();
				if (!item?.types.includes('image/png')) return null;

				const blob = await item.getType('image/png');
				return { type: blob.type, hasData: blob.size > 0 };
			})
		)
		.toEqual({ type: 'image/png', hasData: true });
});
