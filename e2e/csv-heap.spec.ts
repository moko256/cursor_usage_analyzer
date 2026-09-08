import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { acceptLargeCsvDialog } from './helpers/csv-upload';
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
		'Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost,UnusedPayload',
		`2026-08-28T17:00:00.000Z,alpha,0,0,0,0,1234,12.34,"${pad}"`
	].join('\n');
}

async function loadCsvAndSampleHeap(page: import('@playwright/test').Page, paddingBytes: number) {
	const csv = buildMarkerCsv(paddingBytes);
	const csvBytes = Buffer.byteLength(csv);

	await page.goto('/cursor_usage_analyzer/en/');
	await page.waitForLoadState('networkidle');
	await collectGarbage(page);
	const before = await getHeapUsage(page);

	const buffer = Buffer.from(csv);
	acceptLargeCsvDialog(page, buffer.byteLength);
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer
	});

	await expect(page.getByText(/records loaded/)).toBeVisible({ timeout: 60_000 });
	await expect(page.getByRole('img', { name: /Daily token count by model/ })).toBeVisible();

	await collectGarbage(page, 5);
	const after = await getHeapUsage(page);
	const snapshot = await takeHeapSnapshot(page);
	const markerHits = countNeedleInSnapshot(snapshot, MARKER);

	return {
		csvBytes,
		paddingBytes,
		beforeUsed: before.usedSize,
		afterUsed: after.usedSize,
		growth: after.usedSize - before.usedSize,
		markerHits
	};
}

test('CSV bytes and Worker heap are released after parse', async ({ page }, testInfo) => {
	const smallPadding = 512 * 1024;
	const largePadding = 2.5 * 1024 * 1024;

	const small = await loadCsvAndSampleHeap(page, smallPadding);
	const large = await loadCsvAndSampleHeap(page, largePadding);

	const paddingDelta = large.paddingBytes - small.paddingBytes;
	const retainedDelta = large.afterUsed - small.afterUsed;

	const report = {
		small: {
			...small,
			growthFormatted: formatBytes(small.growth),
			csvFormatted: formatBytes(small.csvBytes)
		},
		large: {
			...large,
			growthFormatted: formatBytes(large.growth),
			csvFormatted: formatBytes(large.csvBytes)
		},
		paddingDelta,
		retainedDelta,
		retainedDeltaFormatted: formatBytes(retainedDelta),
		paddingDeltaFormatted: formatBytes(paddingDelta)
	};
	writeFileSync(testInfo.outputPath('csv-heap-report.json'), JSON.stringify(report, null, 2));
	console.log(JSON.stringify(report, null, 2));

	// Unused CSV payload must not remain on the main heap after Worker terminate + GC.
	expect(small.markerHits, `small marker still in heap: ${JSON.stringify(report)}`).toBe(0);
	expect(large.markerHits, `large marker still in heap: ${JSON.stringify(report)}`).toBe(0);

	// Extra unused CSV bytes must not show up as proportional retained heap.
	expect(
		retainedDelta,
		`retained heap scaled with unused CSV padding: ${JSON.stringify(report)}`
	).toBeLessThan(paddingDelta * 0.25);
});
