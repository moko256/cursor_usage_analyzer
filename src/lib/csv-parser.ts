export type CsvPoint = {
	date: string;
	cost: number | null;
	kind: 'amount' | 'free' | 'empty';
};

type WorkerSuccess = {
	type: 'success';
	points: CsvPoint[];
};

type WorkerFailure = {
	type: 'error';
	message: string;
};

const isoDateTimePattern =
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/;

/**
 * Parses only the columns used by the chart. This function is shared with the
 * worker so it can be unit-tested without constructing a browser Worker.
 */
export function parseCsvText(text: string): CsvPoint[] {
	const records = parseRecords(text);
	if (records.length === 0) {
		throw new Error('CSVファイルにデータがありません。');
	}

	const headers = records[0].map((header) =>
		header
			.replace(/^\uFEFF/, '')
			.trim()
			.toLowerCase()
	);
	const dateIndex = headers.indexOf('date');
	const costIndex = headers.indexOf('cost');

	if (dateIndex === -1 || costIndex === -1) {
		throw new Error('CSVにDate列とCost列が必要です。');
	}

	const points: CsvPoint[] = [];
	for (const record of records.slice(1)) {
		const date = record[dateIndex]?.trim() ?? '';
		if (!isIsoDateTime(date)) continue;

		const rawCost = record[costIndex]?.trim() ?? '';
		if (rawCost === '') {
			points.push({ date, cost: null, kind: 'empty' });
			continue;
		}

		if (rawCost.toLowerCase() === 'free') {
			points.push({ date, cost: null, kind: 'free' });
			continue;
		}

		const cost = Number(rawCost);
		if (Number.isFinite(cost)) {
			points.push({ date, cost, kind: 'amount' });
		}
	}

	if (points.length === 0) {
		throw new Error('有効なDateとCostのデータが見つかりません。');
	}

	return points.toSorted((left, right) => Date.parse(left.date) - Date.parse(right.date));
}

/**
 * Sends the file to a dedicated worker. The worker reads and parses the file,
 * returning only the Date and Cost fields needed by the dashboard.
 */
export function parseCsvFile(file: Blob): Promise<CsvPoint[]> {
	return new Promise((resolve, reject) => {
		if (typeof Worker === 'undefined') {
			reject(new Error('このブラウザではバックグラウンド解析を利用できません。'));
			return;
		}

		const worker = new Worker(new URL('./csv-parser.worker.ts', import.meta.url), {
			type: 'module'
		});

		const finish = () => worker.terminate();
		worker.onmessage = (event: MessageEvent<WorkerSuccess | WorkerFailure>) => {
			finish();
			if (event.data.type === 'success') {
				resolve(event.data.points);
			} else {
				reject(new Error(event.data.message));
			}
		};
		worker.onerror = () => {
			finish();
			reject(new Error('CSVファイルをバックグラウンドで解析できませんでした。'));
		};
		worker.postMessage(file);
	});
}

function isIsoDateTime(value: string) {
	return isoDateTimePattern.test(value) && Number.isFinite(Date.parse(value));
}

function parseRecords(text: string): string[][] {
	const records: string[][] = [];
	let record: string[] = [];
	let field = '';
	let insideQuotes = false;

	const pushField = () => {
		record.push(field);
		field = '';
	};
	const pushRecord = () => {
		pushField();
		if (record.some((value) => value.trim() !== '')) records.push(record);
		record = [];
	};

	for (let index = 0; index < text.length; index += 1) {
		const character = text[index];

		if (character === '"') {
			if (insideQuotes && text[index + 1] === '"') {
				field += '"';
				index += 1;
			} else {
				insideQuotes = !insideQuotes;
			}
		} else if (character === ',' && !insideQuotes) {
			pushField();
		} else if ((character === '\n' || character === '\r') && !insideQuotes) {
			pushRecord();
			if (character === '\r' && text[index + 1] === '\n') index += 1;
		} else {
			field += character;
		}
	}

	if (insideQuotes) throw new Error('CSVの引用符が正しく閉じられていません。');
	if (field !== '' || record.length > 0) pushRecord();

	return records;
}
