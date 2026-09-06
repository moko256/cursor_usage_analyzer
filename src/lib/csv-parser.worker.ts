import { CsvParseError, parseCsvText, type WorkerRequest } from './csv-parser';
import { buildDashboardData } from './feature/top/graph/chart-dashboard';

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
	const unknownModel = event.data.unknownModel;
	let buffer: ArrayBuffer | null = event.data.buffer;
	let text: string | null = null;
	let points: ReturnType<typeof parseCsvText> | null = null;

	try {
		text = new TextDecoder().decode(buffer);
		buffer = null;
		points = parseCsvText(text);
		text = null;
		const dashboard = buildDashboardData(points, unknownModel);
		points = null;
		self.postMessage({ type: 'success', dashboard });
	} catch (error) {
		buffer = null;
		text = null;
		points = null;
		self.postMessage({
			type: 'error',
			code: error instanceof CsvParseError ? error.code : 'parse_failed'
		});
	}
};

export {};
