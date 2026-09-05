import { expect, test, type Locator } from '@playwright/test';

test.use({ viewport: { width: 1400, height: 1100 } });

const csv = [
	'Date,Model,Total Tokens,Cost',
	'2026-08-20T12:00:00.000Z,alpha,100,1',
	'2026-08-25T12:00:00.000Z,beta,200,2',
	'2026-08-28T12:00:00.000Z,gamma,300,3'
].join('\n');

async function nonzeroBarFills(chart: Locator) {
	await expect(chart.locator('.lc-bar, .lc-bars')).not.toHaveCount(0);

	return chart.evaluate((element) =>
		[...element.querySelectorAll('.lc-bar, .lc-bars-bar, .lc-bars path, .lc-bars rect')]
			.map((bar) => {
				const box = (bar as SVGGraphicsElement).getBBox();
				const fill =
					bar.getAttribute('fill') || (bar as SVGElement).style.fill || getComputedStyle(bar).fill;

				return { fill, x: box.x, height: box.height };
			})
			.filter((bar) => bar.height > 1)
			.sort((left, right) => left.x - right.x)
	);
}

test('daily model colors stay stable when a shorter range drops other models', async ({ page }) => {
	await page.goto('/cursor_usage_analyzer/en/');
	await page.waitForLoadState('networkidle');
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(csv)
	});

	const tokensChart = page.getByRole('img', { name: 'Daily tokens by model. 3 models, 3 days.' });
	await expect(tokensChart).toBeVisible();

	const allTimeFills = await nonzeroBarFills(tokensChart);
	expect(allTimeFills).toHaveLength(3);
	expect(new Set(allTimeFills.map((bar) => bar.fill)).size).toBe(3);

	await page.getByRole('button', { name: '1 day' }).click();
	const oneDayChart = page.getByRole('img', { name: 'Daily tokens by model. 1 models, 1 days.' });
	await expect(oneDayChart).toBeVisible();

	const oneDayFills = await nonzeroBarFills(oneDayChart);
	expect(oneDayFills).toHaveLength(1);
	expect(oneDayFills[0]?.fill).toBe(allTimeFills[2]?.fill);
	expect(oneDayFills[0]?.fill).not.toBe(allTimeFills[0]?.fill);
});
