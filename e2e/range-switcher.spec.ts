import { expect, test } from '@playwright/test';

const csv = [
	'Date,Model,Total Tokens,Cost',
	'2026-07-19T12:00:00.000Z,alpha,400,4',
	'2026-08-18T12:00:00.000Z,alpha,300,3',
	'2026-08-25T12:00:00.000Z,alpha,200,2',
	'2026-08-28T12:00:00.000Z,alpha,100,1'
].join('\n');

test('range switcher filters charts and usage totals', async ({ page }) => {
	await page.goto('/cursor_usage_analyzer/en/');
	await page.waitForLoadState('networkidle');
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(csv)
	});

	await expect(page.getByText('4 records loaded')).toBeVisible();
	const usage = page.locator('section[aria-live="polite"]');
	await expect(usage.locator('strong').nth(0)).toHaveText('On-demand usage: $10.0');
	await expect(usage.locator('strong').nth(1)).toHaveText('Total tokens: 1,000');

	const group = page.getByRole('group', { name: 'Chart date range' });
	const day1 = group.getByRole('button', { name: '1 day' });
	const day7 = group.getByRole('button', { name: '7 days' });
	const allTime = group.getByRole('button', { name: 'All time' });

	await expect(group).toHaveCount(1);
	await expect(group.locator('> button')).toHaveCount(3);
	await expect(group.locator('> button').last()).toHaveText('All time');
	await expect(group.getByRole('button', { name: '30 days' })).toHaveCount(0);

	const groupBox = await group.boundingBox();
	const usageBox = await usage.boundingBox();
	const chartsBox = await page.locator('.graph-group').boundingBox();
	expect(groupBox?.width ?? 0).toBeGreaterThan(0);
	expect(groupBox?.width ?? 0).toBeLessThan(chartsBox?.width ?? 0);
	expect(groupBox?.y ?? 0).toBeLessThan(usageBox?.y ?? 0);
	await expect(allTime).not.toHaveAttribute('class');
	await expect(day1).toHaveClass('outline secondary');
	await expect(day7).toHaveClass('outline secondary');
	await expect(allTime).toHaveAttribute('aria-current', 'true');
	await expect(day1).not.toHaveAttribute('aria-current');
	await expect(day7).not.toHaveAttribute('aria-current');
	await expect(
		page.getByRole('img', { name: 'Daily tokens by model. 1 models, 4 days.' })
	).toBeVisible();

	await day7.click();
	await expect(day7).not.toHaveAttribute('class');
	await expect(day1).toHaveClass('outline secondary');
	await expect(allTime).toHaveClass('outline secondary');
	await expect(day7).toHaveAttribute('aria-current', 'true');
	await expect(allTime).not.toHaveAttribute('aria-current');
	await expect(
		page.getByRole('img', { name: 'Daily tokens by model. 1 models, 2 days.' })
	).toBeVisible();
	await expect(usage.locator('strong').nth(0)).toHaveText('On-demand usage: $3.0');
	await expect(usage.locator('strong').nth(1)).toHaveText('Total tokens: 300');

	await day1.click();
	await expect(day1).not.toHaveAttribute('class');
	await expect(day7).toHaveClass('outline secondary');
	await expect(allTime).toHaveClass('outline secondary');
	await expect(day1).toHaveAttribute('aria-current', 'true');
	await expect(day7).not.toHaveAttribute('aria-current');
	await expect(
		page.getByRole('img', { name: 'Daily tokens by model. 1 models, 1 days.' })
	).toBeVisible();
	await expect(usage.locator('strong').nth(0)).toHaveText('On-demand usage: $1.0');
	await expect(usage.locator('strong').nth(1)).toHaveText('Total tokens: 100');

	await allTime.click();
	await expect(allTime).not.toHaveAttribute('class');
	await expect(day1).toHaveClass('outline secondary');
	await expect(day7).toHaveClass('outline secondary');
	await expect(allTime).toHaveAttribute('aria-current', 'true');
	await expect(day1).not.toHaveAttribute('aria-current');
	await expect(
		page.getByRole('img', { name: 'Daily tokens by model. 1 models, 4 days.' })
	).toBeVisible();
	await expect(usage.locator('strong').nth(0)).toHaveText('On-demand usage: $10.0');
	await expect(usage.locator('strong').nth(1)).toHaveText('Total tokens: 1,000');
});
