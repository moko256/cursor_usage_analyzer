import { CsvParseError, parseCsvText, type WorkerRequest } from './csv-parser';
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

/** Locals fall out of scope before postMessage so CSV text/points are not retained. */
function buildDashboardFromCsvBytes(buffer: ArrayBuffer, unknownModel: string): DashboardData {
	const points = parseCsvText(new TextDecoder().decode(buffer));
	return buildDashboardData(points, unknownModel);
}

export {};
