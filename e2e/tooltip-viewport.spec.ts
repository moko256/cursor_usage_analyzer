import { expect, test, type Locator, type Page } from '@playwright/test';

const csv = [
	'Date,Model,Total Tokens,Cost',
	'2026-08-20T12:00:00.000Z,alpha,100,1',
	'2026-08-25T12:00:00.000Z,beta,200,2',
	'2026-08-28T23:00:00.000Z,gamma,300,3'
].join('\n');

const tallTooltipCsv = [
	'Date,Model,Total Tokens,Cost',
	...Array.from({ length: 20 }, (_, index) => `2026-08-28T12:00:00.000Z,model-${index},100,1`)
].join('\n');

test.use({ viewport: { width: 900, height: 640 } });

function parseClipInsets(clipPath: string): {
	top: number;
	right: number;
	bottom: number;
	left: number;
} {
	const empty = { top: 0, right: 0, bottom: 0, left: 0 };
	if (!clipPath || clipPath === 'none') return empty;

	const match = /inset\(\s*([^)]+)\)/i.exec(clipPath);
	if (!match) return empty;

	const parts = match[1]
		.replace(/round[\s\S]*/i, '')
		.trim()
		.split(/\s+/)
		.map((token) => Number.parseFloat(token) || 0);

	if (parts.length === 1) {
		return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
	}
	if (parts.length === 2) {
		return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
	}
	if (parts.length === 3) {
		return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
	}
	if (parts.length >= 4) {
		return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
	}

	return empty;
}

async function loadCsv(page: Page, contents: string) {
	await page.goto('/cursor_usage_analyzer/en/');
	await page.waitForLoadState('networkidle');
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(contents)
	});
	await expect(page.locator('.chart-card')).toHaveCount(6);
}

async function visibleTooltip(page: Page) {
	const tooltip = page.locator('.lc-tooltip-root:not([inert])');
	await expect(tooltip).toBeVisible();
	return tooltip;
}

async function expectTooltipInViewport(page: Page) {
	const tooltip = await visibleTooltip(page);
	const padding = 8;

	await expect
		.poll(async () => {
			const snapshot = await tooltip.evaluate((node) => {
				const box = node.getBoundingClientRect();
				const viewport = window.visualViewport;
				const left = viewport?.offsetLeft ?? 0;
				const top = viewport?.offsetTop ?? 0;
				return {
					box: {
						left: box.left,
						top: box.top,
						right: box.right,
						bottom: box.bottom
					},
					clipPath: getComputedStyle(node).clipPath,
					viewport: {
						left,
						top,
						right: left + (viewport?.width ?? window.innerWidth),
						bottom: top + (viewport?.height ?? window.innerHeight)
					}
				};
			});

			const clip = parseClipInsets(snapshot.clipPath);
			const leftEdge = snapshot.box.left + clip.left;
			const topEdge = snapshot.box.top + clip.top;
			const rightEdge = snapshot.box.right - clip.right;
			const bottomEdge = snapshot.box.bottom - clip.bottom;

			return {
				left: leftEdge,
				top: topEdge,
				right: rightEdge,
				bottom: bottomEdge,
				inside:
					leftEdge >= snapshot.viewport.left + padding - 1 &&
					topEdge >= snapshot.viewport.top + padding - 1 &&
					rightEdge <= snapshot.viewport.right - padding + 1 &&
					bottomEdge <= snapshot.viewport.bottom - padding + 1
			};
		})
		.toMatchObject({ inside: true });
}

async function hoverChartCorner(page: Page, card: Locator, corner: 'bottom-right' | 'top-left') {
	const hit = card.locator('.lc-tooltip-rect, .lc-rect').last();
	await expect(hit).toBeVisible();
	const box = await hit.boundingBox();
	const viewport = page.viewportSize();
	expect(box).not.toBeNull();
	expect(viewport).not.toBeNull();

	const pad = 8;
	const visibleLeft = Math.max(box!.x, pad);
	const visibleTop = Math.max(box!.y, pad);
	const visibleRight = Math.min(box!.x + box!.width, viewport!.width - pad);
	const visibleBottom = Math.min(box!.y + box!.height, viewport!.height - pad);
	expect(visibleRight - visibleLeft).toBeGreaterThan(1);
	expect(visibleBottom - visibleTop).toBeGreaterThan(1);

	const x =
		corner === 'bottom-right' ? visibleLeft + (visibleRight - visibleLeft) - 4 : visibleLeft + 4;
	const y =
		corner === 'bottom-right' ? visibleTop + (visibleBottom - visibleTop) - 4 : visibleTop + 4;

	await hit.hover({
		force: true,
		position: { x: Math.max(1, x - box!.x), y: Math.max(1, y - box!.y) }
	});
}

async function dockToViewportBottom(card: Locator) {
	await card.evaluate((node) => {
		const rect = node.getBoundingClientRect();
		window.scrollBy({ top: rect.bottom - window.innerHeight });
	});
}

test('hourly chart tooltip stays in the viewport at the bottom-right edge', async ({ page }) => {
	await loadCsv(page, csv);
	const hourly = page.locator('.hourly-token-card');
	await dockToViewportBottom(hourly);
	await hoverChartCorner(page, hourly, 'bottom-right');
	await expectTooltipInViewport(page);
});

test('cost chart tooltip stays in the viewport at the right edge', async ({ page }) => {
	await loadCsv(page, csv);
	const cost = page.locator('.chart-card').nth(1);
	await hoverChartCorner(page, cost, 'bottom-right');
	await expectTooltipInViewport(page);
});

test('calendar tooltip stays in the viewport on the last cell', async ({ page }) => {
	await loadCsv(page, csv);
	const calendar = page.locator('.calendar-card');
	await dockToViewportBottom(calendar);
	await hoverChartCorner(page, calendar, 'bottom-right');
	await expectTooltipInViewport(page);
});

test('tall daily-model tooltip stays in the viewport', async ({ page }) => {
	await loadCsv(page, tallTooltipCsv);
	const daily = page.locator('.chart-card').nth(0);
	await hoverChartCorner(page, daily, 'top-left');
	const tooltip = await visibleTooltip(page);
	await expectTooltipInViewport(page);

	const chartBox = await daily.locator('.layerchart').boundingBox();
	const tooltipSnapshot = await tooltip.evaluate((node) => {
		const box = node.getBoundingClientRect();
		return {
			y: box.y,
			height: box.height,
			clipPath: getComputedStyle(node).clipPath,
			viewportHeight: window.innerHeight
		};
	});
	expect(chartBox).not.toBeNull();
	expect(tooltipSnapshot.y).toBeGreaterThanOrEqual(chartBox!.y - 1);

	const clip = parseClipInsets(tooltipSnapshot.clipPath);
	const visualHeight = tooltipSnapshot.height - clip.top - clip.bottom;
	expect(visualHeight).toBeGreaterThan(40);
	expect(visualHeight).toBeLessThanOrEqual(tooltipSnapshot.viewportHeight - 16 + 1);
});
