import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import {
	installLongTaskObserver,
	profileRangeSwitch,
	type SwitchProfile
} from './helpers/cpu-profile';
import { buildHeavyUsageCsv } from './helpers/heavy-usage-csv';

test.use({ viewport: { width: 1400, height: 1100 } });

const csv = buildHeavyUsageCsv();

test('range switch keeps the main thread responsive', async ({ page }, testInfo) => {
	await installLongTaskObserver(page);
	await page.goto('/cursor_usage_analyzer/en/');
	await page.waitForLoadState('networkidle');
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(csv)
	});

	await expect(page.getByText(/records loaded/)).toBeVisible({ timeout: 60_000 });
	await expect(page.locator('.chart-card')).toHaveCount(6, { timeout: 60_000 });
	await expect(page.getByRole('img', { name: /Daily token count by model/ })).toBeVisible();

	const profiles: SwitchProfile[] = [];
	for (const step of [
		{ buttonName: '7 days', label: 'all→7d first' },
		{ buttonName: '1 day', label: '7d→1d first' },
		{ buttonName: 'All time', label: '1d→all first return' },
		{ buttonName: '1 day', label: 'all→1d repeat' },
		{ buttonName: 'All time', label: '1d→all repeat' }
	]) {
		profiles.push(await profileRangeSwitch(page, step));
	}

	const report = { csvBytes: Buffer.byteLength(csv), profiles };
	writeFileSync(testInfo.outputPath('range-switch-cpu.json'), JSON.stringify(report, null, 2));
	console.log(JSON.stringify(report, null, 2));

	const firstAway = requireProfile(profiles, 'all→7d first');
	const firstReturn = requireProfile(profiles, '1d→all first return');
	const repeatReturn = requireProfile(profiles, '1d→all repeat');

	expect(firstAway.longestTaskMs, pretty(firstAway)).toBeLessThan(250);
	expect(firstReturn.longestTaskMs, pretty(firstReturn)).toBeLessThan(250);
	expect(repeatReturn.longestTaskMs, pretty(repeatReturn)).toBeLessThan(80);
	expect(repeatReturn.totalBlockingMs, pretty(repeatReturn)).toBeLessThan(50);
	expect(repeatReturn.clickToSettledMs, pretty(repeatReturn)).toBeLessThan(150);
});

function requireProfile(profiles: SwitchProfile[], label: string) {
	const profile = profiles.find((item) => item.label === label);
	if (!profile) throw new Error(`missing profile ${label}`);
	return profile;
}

function pretty(profile: SwitchProfile) {
	return `${profile.label}: longest=${profile.longestTaskMs}ms TBT=${profile.totalBlockingMs}ms settled=${profile.clickToSettledMs}ms`;
}
