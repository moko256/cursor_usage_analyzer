import { interpolateViridis } from 'd3-scale-chromatic';
import { describe, expect, it } from 'vitest';
import { getDailyModelColors } from './chart-style';

describe('getDailyModelColors', () => {
	it('always samples interpolateViridis, regardless of series count', () => {
		expect(getDailyModelColors(0, 1)).toBe(interpolateViridis(0.35));
		expect(getDailyModelColors(0, 3)).toBe(interpolateViridis(0));
		expect(getDailyModelColors(1, 3)).toBe(interpolateViridis(0.5));
		expect(getDailyModelColors(2, 3)).toBe(interpolateViridis(1));
		expect(getDailyModelColors(0, 15)).toBe(interpolateViridis(0));
		expect(getDailyModelColors(7, 15)).toBe(interpolateViridis(7 / 14));
		expect(getDailyModelColors(14, 15)).toBe(interpolateViridis(1));
	});

	it('does not wrap after 10 models', () => {
		const colors = Array.from({ length: 15 }, (_, index) => getDailyModelColors(index, 15));

		expect(new Set(colors).size).toBe(15);
	});
});
