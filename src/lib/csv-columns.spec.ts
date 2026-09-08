import { describe, expect, it } from 'vitest';
import {
	CSV_COLUMN_IDS,
	CSV_COLUMNS,
	hasRequiredCsvColumns,
	pickUsedCsvColumns,
	resolveCsvColumnIndex
} from './csv-columns';

describe('csv columns', () => {
	it('declares only the columns the charts read', () => {
		expect(CSV_COLUMN_IDS).toEqual([
			'date',
			'cost',
			'model',
			'tokens',
			'inputTokens',
			'outputTokens',
			'inputWithCacheWrite',
			'inputWithoutCacheWrite',
			'cacheRead'
		]);
		expect(CSV_COLUMNS.date.required).toBe(true);
		expect(CSV_COLUMNS.cost.required).toBe(true);
		expect(CSV_COLUMNS.model.required).toBe(true);
	});

	it('maps aliases and ignores unused or prototype-key headers', () => {
		const index = resolveCsvColumnIndex([
			'Date',
			'Cloud Agent ID',
			'__proto__',
			'constructor',
			'Model',
			'Total Tokens',
			'Cost',
			'User'
		]);

		expect(index).toEqual({
			date: 0,
			model: 4,
			tokens: 5,
			cost: 6
		});
		expect(index).not.toHaveProperty('__proto__');
		expect(index).not.toHaveProperty('constructor');
		expect(hasRequiredCsvColumns(index)).toBe(true);
	});

	it('copies only declared columns into the row Record', () => {
		const index = resolveCsvColumnIndex(['Date', 'Cloud Agent ID', 'Cost', 'Model']);
		const row = pickUsedCsvColumns(
			['2026-08-28T17:00:00.000Z', 'bc-secret', '1.5', 'alpha', 'extra'],
			index
		);

		expect(row).toEqual({
			date: '2026-08-28T17:00:00.000Z',
			cost: '1.5',
			model: 'alpha'
		});
		expect(Object.keys(row)).toEqual(['date', 'cost', 'model']);
	});

	it('rejects headers that omit a required column', () => {
		expect(hasRequiredCsvColumns(resolveCsvColumnIndex(['Timestamp', 'Amount', 'Model']))).toBe(
			false
		);
	});
});
