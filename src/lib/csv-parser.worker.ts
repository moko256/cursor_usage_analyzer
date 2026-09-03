import { CsvParseError, parseCsvText, type WorkerRequest } from './csv-parser';
import { buildDashboardData } from './feature/top/graph/chart-dashboard';

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
	try {
		const points = parseCsvText(await event.data.file.text());
		const dashboard = buildDashboardData(points, event.data.unknownModel);
		self.postMessage({ type: 'success', dashboard });
	} catch (error) {
		self.postMessage({
			type: 'error',
			code: error instanceof CsvParseError ? error.code : 'parse_failed'
		});
	}
};

export {};
