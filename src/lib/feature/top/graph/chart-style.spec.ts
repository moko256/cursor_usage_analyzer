import { interpolateRgb } from 'd3-interpolate';
import { interpolatePuBu, interpolateTurbo } from 'd3-scale-chromatic';
import { describe, expect, it } from 'vitest';
import {
	getDailyModelColors,
	getTokenBreakdownColor,
	HOURLY_TOKEN_COLOR,
	TOKEN_CALENDAR_COLORS
} from './chart-style';

describe('getDailyModelColors', () => {
	it('always samples interpolateTurbo, regardless of series count', () => {
		expect(getDailyModelColors(0, 1)).toBe(interpolateTurbo(0.7));
		expect(getDailyModelColors(0, 3)).toBe(interpolateTurbo(1));
		expect(getDailyModelColors(1, 3)).toBe(interpolateTurbo(0.5));
		expect(getDailyModelColors(2, 3)).toBe(interpolateTurbo(0));
		expect(getDailyModelColors(0, 15)).toBe(interpolateTurbo(1));
		expect(getDailyModelColors(7, 15)).toBe(interpolateTurbo(1 - 7 / 14));
		expect(getDailyModelColors(14, 15)).toBe(interpolateTurbo(0));
	});

	it('does not wrap after 10 models', () => {
		const colors = Array.from({ length: 15 }, (_, index) => getDailyModelColors(index, 15));

		expect(new Set(colors).size).toBe(15);
	});
});

describe('getTokenBreakdownColor', () => {
	it('interpolates from interpolatePuBu(0.2) to the model color', () => {
		const modelColor = interpolateTurbo(0.7);
		const mix = interpolateRgb(interpolatePuBu(0.2), modelColor);

		expect(getTokenBreakdownColor(0, 1, modelColor)).toBe(mix(1));
		expect(getTokenBreakdownColor(0, 4, modelColor)).toBe(mix(0));
		expect(getTokenBreakdownColor(1, 4, modelColor)).toBe(mix(1 / 3));
		expect(getTokenBreakdownColor(2, 4, modelColor)).toBe(mix(2 / 3));
		expect(getTokenBreakdownColor(3, 4, modelColor)).toBe(mix(1));
	});
});

describe('TOKEN_CALENDAR_COLORS', () => {
	it('samples interpolatePuBu from light to dark across 5 heat bins', () => {
		expect(TOKEN_CALENDAR_COLORS).toEqual(
			[0, 0.25, 0.5, 0.75, 1].map((stop) => interpolatePuBu(stop))
		);
	});
});

describe('HOURLY_TOKEN_COLOR', () => {
	it('uses the mid-dark interpolatePuBu stop', () => {
		expect(HOURLY_TOKEN_COLOR).toBe(interpolatePuBu(0.7));
	});
});
