import { interpolateTurbo, schemeTableau10 } from 'd3-scale-chromatic';
import { describe, expect, it } from 'vitest';
import { getDailyModelColors } from './chart-style';

describe('getDailyModelColors', () => {
	it('uses Tableau10 while the series fits the scheme', () => {
		expect(getDailyModelColors(0, 3)).toBe(schemeTableau10[0]);
		expect(getDailyModelColors(2, 3)).toBe(schemeTableau10[2]);
		expect(getDailyModelColors(9, 10)).toBe(schemeTableau10[9]);
	});

	it('uses interpolateTurbo when there are more series than Tableau10', () => {
		expect(getDailyModelColors(0, 15)).toBe(interpolateTurbo(0));
		expect(getDailyModelColors(7, 15)).toBe(interpolateTurbo(7 / 14));
		expect(getDailyModelColors(14, 15)).toBe(interpolateTurbo(1));
	});

	it('does not wrap after 10 models', () => {
		const colors = Array.from({ length: 15 }, (_, index) => getDailyModelColors(index, 15));

		expect(new Set(colors).size).toBe(15);
	});
});
