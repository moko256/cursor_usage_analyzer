import { CsvParseError, parseCsvText } from './csv-parser';

self.onmessage = async (event: MessageEvent<Blob>) => {
	try {
		const points = parseCsvText(await event.data.text());
		self.postMessage({ type: 'success', points });
	} catch (error) {
		self.postMessage({
			type: 'error',
			code: error instanceof CsvParseError ? error.code : 'parse_failed'
		});
	}
};

export {};
