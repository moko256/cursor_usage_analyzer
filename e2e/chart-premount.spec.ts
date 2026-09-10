import { expect, test } from '@playwright/test';
import { activeChartCards } from './helpers/chart-locators';
import { setCsvInputFiles } from './helpers/csv-upload';
import { buildHeavyUsageCsv } from './helpers/heavy-usage-csv';

test.use({ viewport: { width: 1400, height: 1100 } });

const csv = buildHeavyUsageCsv({ days: 60 });

test('remaining charts mount one at a time after the first card', async ({ page }) => {
	await page.goto('/cursor_usage_analyzer/en/');
	await page.waitForLoadState('networkidle');

	await page.evaluate(() => {
		const counts: number[] = [];
		const record = () => {
			const count = document.querySelectorAll('.graph-range.is-active .chart-card').length;
			if (counts.at(-1) !== count) counts.push(count);
		};
		(globalThis as unknown as { __activeChartCounts: number[] }).__activeChartCounts = counts;
		record();
		new MutationObserver(record).observe(document.body, { childList: true, subtree: true });
	});

	await setCsvInputFiles(page, Buffer.from(csv));
	await expect(page.getByText(/records loaded/)).toBeVisible({ timeout: 60_000 });
	await expect(activeChartCards(page)).toHaveCount(6, { timeout: 60_000 });
	await expect(page.locator('.graph-range')).toHaveCount(3, { timeout: 60_000 });

	const counts = await page.evaluate(
		() => (globalThis as unknown as { __activeChartCounts: number[] }).__activeChartCounts
	);

	expect(counts[0], `counts=${counts.join(',')}`).toBe(0);
	expect(counts, `counts=${counts.join(',')}`).toContain(1);
	expect(counts.at(-1), `counts=${counts.join(',')}`).toBe(6);
	expect(
		counts.some((count) => count > 0 && count < 6),
		`expected incremental mounts, counts=${counts.join(',')}`
	).toBe(true);

	const group = page.getByRole('group', { name: 'Chart date range' });
	await group.getByRole('button', { name: '7 days' }).click();
	await expect(group.getByRole('button', { name: '7 days' })).toHaveAttribute(
		'aria-current',
		'true'
	);
	await expect(activeChartCards(page)).toHaveCount(6);

	await group.getByRole('button', { name: '1 day' }).click();
	await expect(group.getByRole('button', { name: '1 day' })).toHaveAttribute(
		'aria-current',
		'true'
	);
	await expect(activeChartCards(page)).toHaveCount(6);

	await group.getByRole('button', { name: 'All time' }).click();
	await expect(group.getByRole('button', { name: 'All time' })).toHaveAttribute(
		'aria-current',
		'true'
	);
	await expect(page.getByRole('img', { name: /Daily token count by model/ })).toBeVisible();
});
