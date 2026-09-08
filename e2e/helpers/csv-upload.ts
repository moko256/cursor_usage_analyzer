import type { Page } from '@playwright/test';
import { LARGE_CSV_THRESHOLD_BYTES } from '../../src/lib/csv-large-file';

const CSV_HEADER =
	'Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost,Pad';
const CSV_ROW_PREFIX = '2026-08-28T17:00:00.000Z,alpha,0,0,0,0,1234,12.34,"';
const CSV_ROW_SUFFIX = '"';

/** Build a valid usage CSV whose UTF-8 size is exactly `byteLength`. */
export function buildSizedCsv(byteLength: number): Buffer {
	const skeleton = `${CSV_HEADER}\n${CSV_ROW_PREFIX}${CSV_ROW_SUFFIX}\n`;
	const padLength = byteLength - Buffer.byteLength(skeleton);
	if (padLength < 0) {
		throw new Error(`byteLength ${byteLength} is smaller than the CSV skeleton`);
	}
	return Buffer.from(`${CSV_HEADER}\n${CSV_ROW_PREFIX}${'x'.repeat(padLength)}${CSV_ROW_SUFFIX}\n`);
}

export function acceptLargeCsvDialog(page: Page, byteLength: number) {
	if (byteLength <= LARGE_CSV_THRESHOLD_BYTES) return;

	page.once('dialog', (dialog) => {
		void dialog.accept();
	});
}

export async function setCsvInputFiles(page: Page, buffer: Buffer, name = 'usage.csv') {
	acceptLargeCsvDialog(page, buffer.byteLength);
	await page.locator('input[type="file"]').setInputFiles({
		name,
		mimeType: 'text/csv',
		buffer
	});
}
