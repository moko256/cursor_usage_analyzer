import { describe, expect, it } from 'vitest';
import { TOOLTIP_VIEWPORT_PADDING, placeTooltipInViewport } from './chart-tooltip';

const viewport = { width: 800, height: 600, offsetLeft: 0, offsetTop: 0 };

describe('placeTooltipInViewport', () => {
	it('keeps a tooltip that already fits', () => {
		expect(placeTooltipInViewport(100, 80, 200, 60, viewport)).toMatchObject({
			left: 100,
			top: 80
		});
	});

	it('flips left when the tooltip would overflow the right edge', () => {
		expect(placeTooltipInViewport(700, 80, 200, 60, viewport)).toMatchObject({
			left: 500,
			top: 80
		});
	});

	it('clamps a wide tooltip to the padded left edge', () => {
		const placed = placeTooltipInViewport(100, 80, 900, 40, viewport);
		expect(placed.left).toBe(TOOLTIP_VIEWPORT_PADDING);
		expect(placed.maxWidth).toBe(800 - TOOLTIP_VIEWPORT_PADDING * 2);
	});

	it('clips height below the pointer when there is enough space', () => {
		const placed = placeTooltipInViewport(100, 400, 200, 300, viewport);
		expect(placed.top).toBe(400);
		expect(placed.maxHeight).toBe(600 - TOOLTIP_VIEWPORT_PADDING - 400);
	});

	it('flips up only when space below the pointer is too small', () => {
		const placed = placeTooltipInViewport(100, 560, 200, 80, viewport);
		expect(placed.top).toBe(560 - 80);
		expect(placed.maxHeight).toBe(80);
		expect(placed.top).toBeGreaterThanOrEqual(TOOLTIP_VIEWPORT_PADDING);
	});

	it('does not jump a tall tooltip to the top of the viewport', () => {
		const placed = placeTooltipInViewport(120, 430, 240, 500, viewport);
		expect(placed.top).toBe(430);
		expect(placed.maxHeight).toBe(600 - TOOLTIP_VIEWPORT_PADDING - 430);
		expect(placed.top).toBeGreaterThan(100);
	});

	it('accounts for visualViewport offsets', () => {
		const zoomed = { width: 400, height: 300, offsetLeft: 50, offsetTop: 20 };
		const placed = placeTooltipInViewport(10, 10, 100, 40, zoomed);
		expect(placed.left).toBe(50 + TOOLTIP_VIEWPORT_PADDING);
		expect(placed.top).toBe(20 + TOOLTIP_VIEWPORT_PADDING);
	});
});
