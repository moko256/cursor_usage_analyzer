import { interpolateLab, interpolateRgb } from 'd3-interpolate';
import { interpolatePuBu, schemeObservable10 } from 'd3-scale-chromatic';
import { describe, expect, it } from 'vitest';
import {
	getDailyModelColors,
	getTokenBreakdownColor,
	HOURLY_TOKEN_COLOR,
	TOKEN_CALENDAR_COLORS,
	modelAxisPadding,
	modelTickLabelTruncate
} from './chart-style';

const modelColorStops = 10;

function interpolateObservable10(stop: number): string {
	const scaled = stop * 9;
	const k = Math.floor(scaled);
	const t = scaled % 1;

	return interpolateLab(
		schemeObservable10[k],
		schemeObservable10[(k + 1) % schemeObservable10.length]
	)(t);
}

function modelColorStop(modelIndex: number, modelLength: number): number {
	return Math.min(modelIndex / Math.max(modelLength, modelColorStops), 1);
}

describe('getDailyModelColors', () => {
	it('samples a 10-stop schemeObservable10 palette when there are fewer than 10 models', () => {
		expect(getDailyModelColors(0, 1)).toBe(interpolateObservable10(0));
		expect(getDailyModelColors(0, 3)).toBe(interpolateObservable10(0));
		expect(getDailyModelColors(1, 3)).toBe(interpolateObservable10(1 / 10));
		expect(getDailyModelColors(2, 3)).toBe(interpolateObservable10(2 / 10));
		expect(getDailyModelColors(0, 10)).toBe(interpolateObservable10(0));
		expect(getDailyModelColors(7, 10)).toBe(interpolateObservable10(7 / 10));
		expect(getDailyModelColors(9, 10)).toBe(interpolateObservable10(9 / 10));
		expect(getDailyModelColors(0, 20)).toBe(interpolateObservable10(0));
		expect(getDailyModelColors(19, 20)).toBe(interpolateObservable10(19 / 20));
	});

	it('Lab-interpolates between adjacent Observable10 colors, wrapping k=9 to 0', () => {
		expect(interpolateObservable10(0)).toBe(
			interpolateLab(schemeObservable10[0], schemeObservable10[1])(0)
		);
		expect(interpolateObservable10(1 / 9)).toBe(
			interpolateLab(schemeObservable10[1], schemeObservable10[2])(0)
		);
		expect(interpolateObservable10(0.5 / 9)).toBe(
			interpolateLab(schemeObservable10[0], schemeObservable10[1])(0.5)
		);
		expect(interpolateObservable10(1)).toBe(
			interpolateLab(schemeObservable10[9], schemeObservable10[0])(0)
		);
		expect(getDailyModelColors(10, 10)).toBe(
			interpolateLab(schemeObservable10[9], schemeObservable10[0])(0)
		);
		expect(getDailyModelColors(1, 3)).toBe(
			interpolateLab(schemeObservable10[0], schemeObservable10[1])((1 / 10) * 9)
		);
	});

	it('does not wrap after 10 models', () => {
		const colors = Array.from({ length: 15 }, (_, index) => getDailyModelColors(index, 15));

		expect(new Set(colors).size).toBe(15);
	});
});

describe('getTokenBreakdownColor', () => {
	it('interpolates from interpolatePuBu(0.2) to the model color', () => {
		const modelColor = interpolateObservable10(modelColorStop(0, 1));
		const mix = interpolateRgb(interpolatePuBu(0.2), modelColor);

		expect(getTokenBreakdownColor(0, 1, modelColor)).toBe(mix(1));
		expect(getTokenBreakdownColor(0, 4, modelColor)).toBe(mix(0));
		expect(getTokenBreakdownColor(1, 4, modelColor)).toBe(mix(1 / 3));
		expect(getTokenBreakdownColor(2, 4, modelColor)).toBe(mix(2 / 3));
		expect(getTokenBreakdownColor(3, 4, modelColor)).toBe(mix(1));
	});
});

describe('TOKEN_CALENDAR_COLORS', () => {
	it('samples interpolatePuBu from light to dark, reversing the stops in dark mode', () => {
		expect(TOKEN_CALENDAR_COLORS).toEqual(
			[0, 0.25, 0.5, 0.75, 1].map(
				(stop) => `light-dark(${interpolatePuBu(stop)}, ${interpolatePuBu(1 - stop)})`
			)
		);
	});
});

describe('HOURLY_TOKEN_COLOR', () => {
	it('uses the mid-dark interpolatePuBu stop', () => {
		expect(HOURLY_TOKEN_COLOR).toBe(interpolatePuBu(0.7));
	});
});

describe('modelAxisPadding', () => {
	it('sizes left padding from the truncated tick label, not the full model name', () => {
		const short = modelAxisPadding(['composer-2.5']);
		const long = modelAxisPadding(['a'.repeat(50)]);
		const alreadyTruncated = modelAxisPadding([
			'a'.repeat(modelTickLabelTruncate.maxChars) + modelTickLabelTruncate.ellipsis
		]);

		expect(long.left).toBe(alreadyTruncated.left);
		expect(short.left).toBeLessThan(long.left);
		expect(long).toMatchObject({ top: 4, right: 24, bottom: 20 });
	});
});
