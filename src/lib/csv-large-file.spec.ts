import { describe, expect, it } from 'vitest';
import { isLargeCsvFile, LARGE_CSV_THRESHOLD_BYTES } from './csv-large-file';

describe('isLargeCsvFile', () => {
	it('is false at and below the 1 MiB threshold', () => {
		expect(isLargeCsvFile({ size: 0 })).toBe(false);
		expect(isLargeCsvFile({ size: LARGE_CSV_THRESHOLD_BYTES })).toBe(false);
	});

	it('is true only when the file exceeds 1 MiB', () => {
		expect(isLargeCsvFile({ size: LARGE_CSV_THRESHOLD_BYTES + 1 })).toBe(true);
	});
});
