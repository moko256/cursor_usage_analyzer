import { interpolatePuBu } from 'd3-scale-chromatic';
import { describe, expect, it } from 'vitest';
import { getDailyModelColors } from './chart-style';

describe('getDailyModelColors', () => {
	it('always samples interpolatePuBu, regardless of series count', () => {
		expect(getDailyModelColors(0, 1)).toBe(interpolatePuBu(0.7));
		expect(getDailyModelColors(0, 3)).toBe(interpolatePuBu(1));
		expect(getDailyModelColors(1, 3)).toBe(interpolatePuBu(0.5));
		expect(getDailyModelColors(2, 3)).toBe(interpolatePuBu(0));
		expect(getDailyModelColors(0, 15)).toBe(interpolatePuBu(1));
		expect(getDailyModelColors(7, 15)).toBe(interpolatePuBu(1 - 7 / 14));
		expect(getDailyModelColors(14, 15)).toBe(interpolatePuBu(0));
	});

	it('does not wrap after 10 models', () => {
		const colors = Array.from({ length: 15 }, (_, index) => getDailyModelColors(index, 15));

		expect(new Set(colors).size).toBe(15);
	});
});
