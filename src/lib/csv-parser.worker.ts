import {
	createThrottledCsvProgress,
	CsvParseError,
	parseCsvText,
	type WorkerRequest
} from './csv-parser';
import { buildDashboardData } from './feature/top/graph/chart-dashboard';
import type { DashboardData } from './feature/top/graph/chart-types';

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
	try {
		const dashboard = buildDashboardFromCsvBytes(event.data.buffer, event.data.unknownModel);
		self.postMessage({ type: 'success', dashboard });
	} catch (error) {
		self.postMessage({
			type: 'error',
			code: error instanceof CsvParseError ? error.code : 'parse_failed'
		});
	}
};

/** Locals fall out of scope before the success postMessage so CSV text/points are not retained. */
function buildDashboardFromCsvBytes(buffer: ArrayBuffer, unknownModel: string): DashboardData {
	const text = new TextDecoder().decode(buffer);
	const totalChars = text.length;
	const postProgress = createThrottledCsvProgress((progress) => {
		self.postMessage({ type: 'progress', ...progress });
	});
	const points = parseCsvText(text, postProgress);
	self.postMessage({ type: 'progress', processedChars: totalChars, totalChars });
	return buildDashboardData(points, unknownModel);
}

export {};
