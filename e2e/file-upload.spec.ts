import { expect, test } from '@playwright/test';
import { LARGE_CSV_THRESHOLD_BYTES } from '../src/lib/csv-large-file';
import { activeChartCards } from './helpers/chart-locators';
import { buildSizedCsv } from './helpers/csv-upload';

test('CSVファイルを添付すると解析結果が表示される', async ({ page }) => {
	await page.goto('/cursor_usage_analyzer/ja/');

	await page.waitForLoadState('networkidle');
	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(
			[
				'Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost',
				'2026-08-28T17:00:00.000Z,gpt-5.6-luna-high,0,0,0,0,1234,12.34'
			].join('\n')
		)
	});

	await expect(page.getByText('1件を読み込みました')).toBeVisible();
	await expect(page.locator('section > strong').nth(0)).toHaveText('On-demand使用コスト: $12.3');
	await expect(page.locator('section > strong').nth(1)).toHaveText('合計トークン数: 1,234');
});

test('必須列が欠けているとエラーになる', async ({ page }) => {
	await page.goto('/cursor_usage_analyzer/ja/');
	await page.waitForLoadState('networkidle');

	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from('Date,Cost,Model\n2026-08-28T17:00:00.000Z,1.5,alpha\n')
	});

	await expect(page.getByRole('alert')).toHaveText('CSVに必須の列がありません');
});

test('非CSVを選ぶとエラーになりグラフが消える', async ({ page }) => {
	await page.goto('/cursor_usage_analyzer/ja/');
	await page.waitForLoadState('networkidle');

	const fileInput = page.locator('input[type="file"]');
	await fileInput.setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(
			'Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost\n2026-08-28T17:00:00.000Z,alpha,0,0,0,0,10,1\n'
		)
	});
	await expect(activeChartCards(page)).toHaveCount(6);

	await fileInput.setInputFiles({
		name: 'notes.txt',
		mimeType: 'text/plain',
		buffer: Buffer.from('not a csv')
	});

	await expect(page.getByRole('alert')).toHaveText('CSVファイルを選択してください');
	await expect(page.locator('.chart-card')).toHaveCount(0);
});

test('1MBちょうどのCSVは確認なしで読み込む', async ({ page }) => {
	await page.goto('/cursor_usage_analyzer/ja/');
	await page.waitForLoadState('networkidle');

	const csv = buildSizedCsv(LARGE_CSV_THRESHOLD_BYTES);
	expect(csv.byteLength).toBe(LARGE_CSV_THRESHOLD_BYTES);

	let dialogShown = false;
	page.once('dialog', (dialog) => {
		dialogShown = true;
		void dialog.dismiss();
	});

	await page.locator('input[type="file"]').setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: csv
	});

	await expect(page.getByText('1件を読み込みました')).toBeVisible();
	expect(dialogShown).toBe(false);
});

test('1MB超のCSVはOKを押したときだけ読み込む', async ({ page }) => {
	await page.goto('/cursor_usage_analyzer/ja/');
	await page.waitForLoadState('networkidle');

	const csv = buildSizedCsv(LARGE_CSV_THRESHOLD_BYTES + 1);
	const fileInput = page.locator('input[type="file"]');

	const dismissed = page.waitForEvent('dialog').then(async (dialog) => {
		expect(dialog.type()).toBe('confirm');
		expect(dialog.message()).toBe('大きなファイルです。このまま読み込みますか？');
		await dialog.dismiss();
	});
	await fileInput.setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: csv
	});
	await dismissed;

	await expect(page.getByText('1件を読み込みました')).toHaveCount(0);
	await expect(page.locator('.chart-card')).toHaveCount(0);

	const accepted = page.waitForEvent('dialog').then(async (dialog) => {
		expect(dialog.message()).toBe('大きなファイルです。このまま読み込みますか？');
		await dialog.accept();
	});
	await fileInput.setInputFiles({
		name: 'usage.csv',
		mimeType: 'text/csv',
		buffer: csv
	});
	await accepted;

	await expect(page.getByText('1件を読み込みました')).toBeVisible();
	await expect(activeChartCards(page)).toHaveCount(6);
});

test('1MB超でも非CSVは確認せずエラーになる', async ({ page }) => {
	await page.goto('/cursor_usage_analyzer/ja/');
	await page.waitForLoadState('networkidle');

	let dialogShown = false;
	page.once('dialog', (dialog) => {
		dialogShown = true;
		void dialog.accept();
	});

	await page.locator('input[type="file"]').setInputFiles({
		name: 'notes.txt',
		mimeType: 'text/plain',
		buffer: Buffer.alloc(LARGE_CSV_THRESHOLD_BYTES + 1, 97)
	});

	await expect(page.getByRole('alert')).toHaveText('CSVファイルを選択してください');
	expect(dialogShown).toBe(false);
});
