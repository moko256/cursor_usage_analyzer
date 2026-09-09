import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDashboardData } from '$lib/feature/top/graph/chart-dashboard';
import { csvPoint } from './csv-point.fixture';
import { CsvParseError } from './csv-parser';

const harness = vi.hoisted(() => {
	let messages: unknown[] = [];
	class MockWorker {
		onmessage: ((event: { data: unknown }) => void) | null = null;
		onerror: (() => void) | null = null;
		terminate = vi.fn();
		postMessage() {
			queueMicrotask(() => {
				for (const data of messages) {
					this.onmessage?.({ data });
				}
			});
		}
	}
	return {
		MockWorker,
		setMessages(next: unknown[]) {
			messages = next;
		}
	};
});

vi.mock('$lib/csv-parser.worker?worker&inline', () => ({
	default: harness.MockWorker
}));

const { parseCsvFile } = await import('./csv-parser');

const dashboard = buildDashboardData([csvPoint()]);

describe('parseCsvFile progress', () => {
	beforeEach(() => {
		vi.stubGlobal('Worker', class {});
		harness.setMessages([]);
	});

	it('forwards progress without treating it as an error', async () => {
		harness.setMessages([
			{ type: 'progress', processedChars: 3, totalChars: 10 },
			{ type: 'progress', processedChars: 10, totalChars: 10 },
			{ type: 'success', dashboard }
		]);
		const reports: { processedChars: number; totalChars: number }[] = [];

		const result = await parseCsvFile(new Blob(['csv']), 'unknown', (progress) => {
			reports.push(progress);
		});

		expect(reports).toEqual([
			{ processedChars: 3, totalChars: 10 },
			{ processedChars: 10, totalChars: 10 }
		]);
		expect(result).toEqual(dashboard);
	});

	it('still rejects a later error after progress', async () => {
		harness.setMessages([
			{ type: 'progress', processedChars: 2, totalChars: 8 },
			{ type: 'error', code: 'missing_columns' }
		]);

		await expect(parseCsvFile(new Blob(['csv']), 'unknown')).rejects.toBeInstanceOf(CsvParseError);
	});
});
