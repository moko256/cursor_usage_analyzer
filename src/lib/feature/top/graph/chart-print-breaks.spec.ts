import { describe, expect, it } from 'vitest';
import { printBreakBeforeFlags } from './chart-print-breaks';

describe('printBreakBeforeFlags', () => {
	it('keeps cards that fit the remaining space on the page', () => {
		expect(
			printBreakBeforeFlags(
				[
					{ top: 40, height: 200 },
					{ top: 260, height: 200 }
				],
				960
			)
		).toEqual([false, false]);
	});

	it('moves a card that would split onto the next page', () => {
		expect(
			printBreakBeforeFlags(
				[
					{ top: 40, height: 400 },
					{ top: 460, height: 400 },
					{ top: 880, height: 400 }
				],
				960
			)
		).toEqual([false, false, true]);
	});

	it('accounts for space skipped by an earlier page break', () => {
		expect(
			printBreakBeforeFlags(
				[
					{ top: 800, height: 300 },
					{ top: 1120, height: 300 }
				],
				960
			)
		).toEqual([true, false]);
	});

	it('does not force a break when the card is taller than a page', () => {
		expect(printBreakBeforeFlags([{ top: 800, height: 1200 }], 960)).toEqual([false]);
	});
});
