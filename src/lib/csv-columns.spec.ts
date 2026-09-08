import { describe, expect, it } from 'vitest';
import { CSV_COLUMN_IDS, pickUsedCsvColumns, resolveCsvColumnIndex } from './csv-columns';

const usedHeaders = [
	'Date',
	'Cloud Agent ID',
	'__proto__',
	'constructor',
	'Model',
	'Input (w/ Cache Write)',
	'Input (w/o Cache Write)',
	'Cache Read',
	'Output Tokens',
	'Total Tokens',
	'Cost',
	'User'
];

describe('csv columns', () => {
	it('declares only the columns the charts read', () => {
		expect(CSV_COLUMN_IDS).toEqual([
			'date',
			'cost',
			'model',
			'tokens',
			'outputTokens',
			'inputWithCacheWrite',
			'inputWithoutCacheWrite',
			'cacheRead'
		]);
	});

	it('maps aliases and ignores unused or prototype-key headers', () => {
		const index = resolveCsvColumnIndex(usedHeaders);

		expect(index).toEqual({
			date: 0,
			model: 4,
			inputWithCacheWrite: 5,
			inputWithoutCacheWrite: 6,
			cacheRead: 7,
			outputTokens: 8,
			tokens: 9,
			cost: 10
		});
		expect(index).not.toHaveProperty('__proto__');
		expect(index).not.toHaveProperty('constructor');
	});

	it('copies only declared columns into the row Record', () => {
		const index = resolveCsvColumnIndex(usedHeaders);
		expect(index).not.toBeNull();

		const row = pickUsedCsvColumns(
			[
				'2026-08-28T17:00:00.000Z',
				'bc-secret',
				'pollute',
				'ctor',
				'alpha',
				'1',
				'2',
				'3',
				'4',
				'10',
				'1.5',
				'ada'
			],
			index!
		);

		expect(row).toEqual({
			date: '2026-08-28T17:00:00.000Z',
			cost: '1.5',
			model: 'alpha',
			tokens: '10',
			outputTokens: '4',
			inputWithCacheWrite: '1',
			inputWithoutCacheWrite: '2',
			cacheRead: '3'
		});
		expect(Object.keys(row)).toEqual(CSV_COLUMN_IDS);
	});

	it('rejects headers that omit a required column', () => {
		expect(resolveCsvColumnIndex(['Date', 'Cost', 'Model'])).toBeNull();
		expect(resolveCsvColumnIndex(['Timestamp', 'Amount', 'Model'])).toBeNull();
	});
});
