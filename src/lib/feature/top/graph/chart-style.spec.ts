import { describe, expect, it } from 'vitest';
import { getDailyModelColors, modelColorStop } from './chart-style';

describe('modelColorStop', () => {
	it('keeps a single series on the primary stop', () => {
		expect(modelColorStop(0, 1)).toBe(0);
		expect(modelColorStop(0, 0)).toBe(0);
	});

	it('puts 0 at the bottom of the stack and 1 at the top', () => {
		expect(modelColorStop(0, 4)).toBe(0);
		expect(modelColorStop(3, 4)).toBe(1);
		expect(modelColorStop(1, 3)).toBe(0.5);
	});
});

describe('getDailyModelColors', () => {
	it('lets CSS compute HSL from Pico primary', () => {
		const color = getDailyModelColors(1, 3);

		expect(color).toMatch(/^light-dark\(/);
		expect(color).toContain('hsl(from var(--pico-primary) h s calc(l + 0.5 * 32%))');
		expect(color).toContain('hsl(from var(--pico-primary-background) h s calc(l + 0.5 * 40%))');
	});

	it('keeps the darkest stop at the bottom of the stack', () => {
		expect(getDailyModelColors(0, 5)).toContain('l + 0 * 32%');
		expect(getDailyModelColors(4, 5)).toContain('l + 1 * 32%');
	});

	it('does not wrap after 10 models', () => {
		const colors = Array.from({ length: 15 }, (_, index) => getDailyModelColors(index, 15));

		expect(new Set(colors).size).toBe(15);
	});
});
