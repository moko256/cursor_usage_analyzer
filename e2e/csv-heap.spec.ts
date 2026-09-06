import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import {
	collectGarbage,
	countNeedleInSnapshot,
	formatBytes,
	getHeapUsage,
	takeHeapSnapshot
} from './helpers/heap-snapshot';

test.use({ viewport: { width: 1200, height: 900 } });

/** Unique token that only appears in an unused CSV column (never chart state). */
const MARKER = `HEAP_CSV_MARKER_${'x'.repeat(48)}_END`;

function buildMarkerCsv(paddingBytes: number) {
	const pad = MARKER.repeat(Math.ceil(paddingBytes / MARKER.length)).slice(0, paddingBytes);
	return [
		'Date,Model,Total Tokens,Cost,UnusedPayload',
		`2026-08-28T17:00:00.000Z,alpha,1234,12.34,"${pad}"`
	].join('\n');
}

test('CSV bytes and Worker heap are released after parse', async ({ page }, testInfo) => {
	const paddingBytes = 2 * 1024 * 1024;
	const csv = buildMarkerCsv(paddingBytes);
	const csvBytes = Buffer.byteLength(csv);

	await page.goto('/cursor_usage_analyzer/en/');
	await page.waitForLoadState('networkidle');
	await collectGarbage(page);

	const before = await getHeapUsage(page);

	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(csv)
	});

	await expect(page.getByText(/records loaded/)).toBeVisible({ timeout: 60_000 });
	await expect(page.getByRole('img', { name: /Daily token count by model/ })).toBeVisible();

	await collectGarbage(page, 5);
	const after = await getHeapUsage(page);
	const snapshot = await takeHeapSnapshot(page);
	const markerHits = countNeedleInSnapshot(snapshot, MARKER);
	const growth = after.usedSize - before.usedSize;

	const report = {
		csvBytes,
		paddingBytes,
		beforeUsed: before.usedSize,
		afterUsed: after.usedSize,
		growth,
		growthFormatted: formatBytes(growth),
		csvFormatted: formatBytes(csvBytes),
		markerHits,
		retainedFraction: growth / csvBytes
	};
	writeFileSync(testInfo.outputPath('csv-heap-report.json'), JSON.stringify(report, null, 2));
	console.log(JSON.stringify(report, null, 2));

	// Unused CSV payload must not remain on the main heap after Worker terminate + GC.
	expect(markerHits, `marker still in heap snapshot: ${JSON.stringify(report)}`).toBe(0);

	// Dashboard + charts for one row should not retain nearly the whole CSV.
	expect(growth, `heap grew too much: ${JSON.stringify(report)}`).toBeLessThan(csvBytes * 0.35);
});
