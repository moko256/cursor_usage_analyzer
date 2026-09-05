import { describe, expect, it } from 'vitest';
import { TOOLTIP_VIEWPORT_PADDING, tooltipViewportShift } from './chart-tooltip';

const viewport = { width: 800, height: 600, offsetLeft: 0, offsetTop: 0 };

describe('tooltipViewportShift', () => {
	it('does not shift a tooltip already inside the viewport', () => {
		expect(tooltipViewportShift(100, 80, 200, 60, viewport)).toEqual({ x: 0, y: 0 });
	});

	it('shifts left when the tooltip would overflow the right edge', () => {
		expect(tooltipViewportShift(700, 80, 200, 60, viewport)).toEqual({
			x: 800 - 200 - TOOLTIP_VIEWPORT_PADDING - 700,
			y: 0
		});
	});

	it('shifts up when the tooltip would overflow the bottom edge', () => {
		expect(tooltipViewportShift(100, 560, 200, 80, viewport)).toEqual({
			x: 0,
			y: 600 - 80 - TOOLTIP_VIEWPORT_PADDING - 560
		});
	});

	it('shifts right and down when the tooltip would overflow the top-left', () => {
		expect(tooltipViewportShift(-40, -20, 120, 50, viewport)).toEqual({
			x: TOOLTIP_VIEWPORT_PADDING - -40,
			y: TOOLTIP_VIEWPORT_PADDING - -20
		});
	});

	it('pins a tooltip larger than the viewport to the padded origin', () => {
		expect(tooltipViewportShift(40, 30, 900, 700, viewport)).toEqual({
			x: TOOLTIP_VIEWPORT_PADDING - 40,
			y: TOOLTIP_VIEWPORT_PADDING - 30
		});
	});

	it('accounts for visualViewport offsets', () => {
		const zoomed = { width: 400, height: 300, offsetLeft: 50, offsetTop: 20 };
		expect(tooltipViewportShift(10, 10, 100, 40, zoomed)).toEqual({
			x: 50 + TOOLTIP_VIEWPORT_PADDING - 10,
			y: 20 + TOOLTIP_VIEWPORT_PADDING - 10
		});
	});
});
