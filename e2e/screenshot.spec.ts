import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

const viewport = { width: 1280, height: 720 } as const;
const pageZoom = '0.75';
const colorSchemes = ['light', 'dark'] as const;

const csv = buildScreenshotCsv();

function buildScreenshotCsv() {
	const header =
		'Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost';
	const models = [
		['gpt-5.6-luna-high', 220000, 2.8],
		['claude-4.5-sonnet-thinking', 150000, 2.1],
		['composer-2.5', 45000, 0.35]
	] as const;

	const lines = [header];
	for (let day = 0; day < 12; day += 1) {
		for (const [model, tokenBase, costBase] of models) {
			if (model === 'composer-2.5' && day % 4 === 3) continue;

			const tokens = tokenBase + day * 8000;
			const inputW = Math.round(tokens * 0.12);
			const inputWo = Math.round(tokens * 0.04);
			const cacheRead = Math.round(tokens * 0.72);
			const output = tokens - inputW - inputWo - cacheRead;
			const date = new Date(Date.UTC(2026, 7, 18 + day, 8 + (day % 10), 15, 0)).toISOString();
			const cost = (costBase + day * 0.12).toFixed(2);
			lines.push(`${date},${model},${inputW},${inputWo},${cacheRead},${output},${tokens},${cost}`);
		}
	}

	return lines.join('\n');
}

function pngSize(buffer: Buffer) {
	return {
		width: buffer.readUInt32BE(16),
		height: buffer.readUInt32BE(20)
	};
}

function luminance(rgb: string) {
	const [red = 0, green = 0, blue = 0] = rgb.match(/\d+/g)?.map(Number) ?? [];
	return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
}

async function setPageZoom(page: Page) {
	await page.evaluate((zoom) => {
		document.documentElement.style.zoom = zoom;
	}, pageZoom);
}

async function loadEnglishDashboard(page: Page, { zoom = true } = {}) {
	await page.goto('/cursor_usage_analyzer/en/');
	await page.waitForLoadState('networkidle');
	if (zoom) await setPageZoom(page);
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(csv)
	});

	await expect(page.getByText(/records loaded/)).toBeVisible();
	await expect(page.locator('.chart-card')).toHaveCount(6);
	await expect(page.getByRole('img', { name: /Daily tokens by model/ })).toBeVisible();
	await expect(page.locator('.lc-bar, .lc-bars')).not.toHaveCount(0);
	await page.evaluate(() => document.fonts.ready);
}

async function expectScreenshotPage(
	page: Page,
	colorScheme: (typeof colorSchemes)[number],
	{ zoom = true } = {}
) {
	await expect(page.getByRole('heading', { name: 'Cursor Usage Analyzer' })).toBeVisible();
	await expect(page.getByText(/On-demand usage:/)).toBeVisible();
	if (zoom) {
		await expect
			.poll(() => page.evaluate(() => document.documentElement.style.zoom))
			.toBe(pageZoom);
	}

	const { prefersDark, background } = await page.evaluate(() => ({
		prefersDark: matchMedia('(prefers-color-scheme: dark)').matches,
		background: getComputedStyle(document.documentElement).backgroundColor
	}));
	expect(prefersDark).toBe(colorScheme === 'dark');
	if (colorScheme === 'dark') {
		expect(luminance(background)).toBeLessThan(0.5);
	} else {
		expect(luminance(background)).toBeGreaterThan(0.5);
	}
}

function screenshotAssetPath(name: string) {
	return fileURLToPath(new URL(`../assets/${name}`, import.meta.url));
}

const screenshotUse = {
	viewport,
	locale: 'en-US',
	timezoneId: 'UTC',
	deviceScaleFactor: 1,
	reducedMotion: 'reduce'
} as const;

test.describe('README screenshots', () => {
	test.use(screenshotUse);

	for (const colorScheme of colorSchemes) {
		test.describe(colorScheme, () => {
			test.use({ colorScheme });

			test(`saves an English ${colorScheme} 1280x720 screenshot under assets/`, async ({
				page
			}) => {
				await loadEnglishDashboard(page);
				await expectScreenshotPage(page, colorScheme);

				const screenshot = await page.screenshot({
					path: screenshotAssetPath(`screenshot-${colorScheme}.png`),
					animations: 'disabled',
					caret: 'hide'
				});

				expect(pngSize(screenshot)).toEqual(viewport);
			});
		});
	}
});

test.describe('full-page screenshots', () => {
	test.use(screenshotUse);

	for (const colorScheme of colorSchemes) {
		test.describe(colorScheme, () => {
			test.use({ colorScheme });

			test(`saves an English ${colorScheme} full-page screenshot under assets/`, async ({
				page
			}) => {
				await loadEnglishDashboard(page, { zoom: false });
				await expectScreenshotPage(page, colorScheme, { zoom: false });
				await expect(page.locator('.calendar-card')).toBeVisible();

				const screenshot = await page.screenshot({
					path: screenshotAssetPath(`screenshot-${colorScheme}-full.png`),
					fullPage: true,
					animations: 'disabled',
					caret: 'hide'
				});

				const size = pngSize(screenshot);
				expect(size.width).toBe(viewport.width);
				expect(size.height).toBeGreaterThan(viewport.height);
			});
		});
	}
});
