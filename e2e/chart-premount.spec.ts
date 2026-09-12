import { expect, test } from '@playwright/test';
import { activeChartCards } from './helpers/chart-locators';
import { setCsvInputFiles } from './helpers/csv-upload';
import { buildHeavyUsageCsv } from './helpers/heavy-usage-csv';

test.use({ viewport: { width: 1400, height: 1100 } });

const csv = buildHeavyUsageCsv({ days: 60 });

test('all-time charts appear together; other ranges premount per DashboardCharts', async ({
	page
}) => {
	await page.goto('/cursor_usage_analyzer/en/');
	await page.waitForLoadState('networkidle');

	await page.evaluate(() => {
		const activeCounts: number[] = [];
		const inactiveCounts: number[] = [];
		const record = () => {
			const active = document.querySelectorAll('.graph-range.is-active .chart-card').length;
			const inactive = document.querySelectorAll('.graph-range:not(.is-active) .chart-card').length;
			if (activeCounts.at(-1) !== active) activeCounts.push(active);
			if (inactiveCounts.at(-1) !== inactive) inactiveCounts.push(inactive);
		};
		(
			globalThis as unknown as {
				__activeChartCounts: number[];
				__inactiveChartCounts: number[];
			}
		).__activeChartCounts = activeCounts;
		(
			globalThis as unknown as {
				__inactiveChartCounts: number[];
			}
		).__inactiveChartCounts = inactiveCounts;
		record();
		new MutationObserver(record).observe(document.body, { childList: true, subtree: true });
	});

	await setCsvInputFiles(page, Buffer.from(csv));
	await expect(page.getByText(/records loaded/)).toBeVisible({ timeout: 60_000 });
	await expect(activeChartCards(page)).toHaveCount(6, { timeout: 60_000 });
	await expect(page.locator('.graph-range')).toHaveCount(3, { timeout: 60_000 });

	const { activeCounts, inactiveCounts } = await page.evaluate(() => {
		const state = globalThis as unknown as {
			__activeChartCounts: number[];
			__inactiveChartCounts: number[];
		};
		return {
			activeCounts: state.__activeChartCounts,
			inactiveCounts: state.__inactiveChartCounts
		};
	});

	expect(activeCounts[0], `active=${activeCounts.join(',')}`).toBe(0);
	expect(activeCounts.at(-1), `active=${activeCounts.join(',')}`).toBe(6);
	expect(
		activeCounts.some((count) => count > 0 && count < 6),
		`all-time should appear as one period, active=${activeCounts.join(',')}`
	).toBe(false);

	expect(inactiveCounts[0], `inactive=${inactiveCounts.join(',')}`).toBe(0);
	expect(inactiveCounts.at(-1), `inactive=${inactiveCounts.join(',')}`).toBe(12);
	expect(
		inactiveCounts.every((count) => count % 6 === 0),
		`other ranges should premount a full DashboardCharts, inactive=${inactiveCounts.join(',')}`
	).toBe(true);
	expect(
		inactiveCounts.some((count) => count === 6),
		`7-day DashboardCharts should appear before 1-day, inactive=${inactiveCounts.join(',')}`
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
