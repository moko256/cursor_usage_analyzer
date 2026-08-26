import { parseCsvText } from './csv-parser';

self.onmessage = async (event: MessageEvent<Blob>) => {
	try {
		const points = parseCsvText(await event.data.text());
		self.postMessage({ type: 'success', points });
	} catch (error) {
		self.postMessage({
			type: 'error',
			message: error instanceof Error ? error.message : 'CSVを解析できませんでした。'
		});
	}
};

export {};
