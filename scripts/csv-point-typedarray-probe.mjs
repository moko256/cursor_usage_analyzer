/**
 * Probe: can CsvPoint become a TypedArray layout and skip worker structured-clone copies?
 *
 * Run: node --expose-gc scripts/csv-point-typedarray-probe.mjs
 *
 * Mirrors the live CsvPoint shape from src/lib/csv-parser.ts and the worker
 * postMessage({ type: 'success', points }) path in src/lib/csv-parser.worker.ts.
 */
import { writeFileSync } from 'node:fs';
import { Worker } from 'node:worker_threads';
import v8 from 'node:v8';

const MODELS = [
	'gpt-5.6-luna-high',
	'cursor-grok-4.6-high',
	'claude-opus-5-thinking-high',
	'gpt-5.6-sol-high',
	'composer-2.5',
	'claude-sonnet-5-thinking-medium',
	'gpt-5.6-terra-high',
	'cursor-grok-4.6-medium'
];

const ROW_COUNTS = [1_000, 10_000, 50_000, 100_000];
const ITERATIONS = 7;
const WARMUP = 2;

function makePoints(count) {
	const points = new Array(count);
	const start = Date.parse('2025-01-01T00:00:00.000Z');
	for (let index = 0; index < count; index += 1) {
		const timestamp = start + index * 60_000;
		points[index] = {
			date: new Date(timestamp).toISOString(),
			model: MODELS[index % MODELS.length],
			cost: index % 5 === 0 ? null : (index % 100) + 0.34,
			tokens: 1_000 + (index % 50_000),
			inputWithCacheWrite: index % 10_000,
			inputWithoutCacheWrite: index % 500,
			cacheRead: index % 200_000,
			outputTokens: index % 8_000
		};
	}
	return points;
}

function internModels(points) {
	const models = [];
	const modelMap = new Map();
	const modelIndex = new Uint16Array(points.length);
	for (let index = 0; index < points.length; index += 1) {
		const model = points[index].model;
		let interned = modelMap.get(model);
		if (interned === undefined) {
			interned = models.length;
			modelMap.set(model, interned);
			models.push(model);
		}
		modelIndex[index] = interned;
	}
	return { models, modelIndex };
}

function toColumns(points) {
	const count = points.length;
	const timestamps = new Float64Array(count);
	const costs = new Float64Array(count);
	const tokens = new Float64Array(count);
	const inputWithCacheWrite = new Float64Array(count);
	const inputWithoutCacheWrite = new Float64Array(count);
	const cacheRead = new Float64Array(count);
	const outputTokens = new Float64Array(count);
	const { models, modelIndex } = internModels(points);

	for (let index = 0; index < count; index += 1) {
		const point = points[index];
		timestamps[index] = Date.parse(point.date);
		costs[index] = point.cost === null ? Number.NaN : point.cost;
		tokens[index] = point.tokens;
		inputWithCacheWrite[index] = point.inputWithCacheWrite;
		inputWithoutCacheWrite[index] = point.inputWithoutCacheWrite;
		cacheRead[index] = point.cacheRead;
		outputTokens[index] = point.outputTokens;
	}

	return {
		timestamps,
		costs,
		tokens,
		inputWithCacheWrite,
		inputWithoutCacheWrite,
		cacheRead,
		outputTokens,
		modelIndex,
		models
	};
}

function packedBytes(columns) {
	return (
		columns.timestamps.byteLength +
		columns.costs.byteLength +
		columns.tokens.byteLength +
		columns.inputWithCacheWrite.byteLength +
		columns.inputWithoutCacheWrite.byteLength +
		columns.cacheRead.byteLength +
		columns.outputTokens.byteLength +
		columns.modelIndex.byteLength
	);
}

function denseBytes(count) {
	// timestamp f64 + cost f64 + 5x u32 token fields + u16 model index
	return count * (8 + 8 + 5 * 4 + 2);
}

function cloneColumns(columns) {
	return {
		timestamps: new Float64Array(columns.timestamps),
		costs: new Float64Array(columns.costs),
		tokens: new Float64Array(columns.tokens),
		inputWithCacheWrite: new Float64Array(columns.inputWithCacheWrite),
		inputWithoutCacheWrite: new Float64Array(columns.inputWithoutCacheWrite),
		cacheRead: new Float64Array(columns.cacheRead),
		outputTokens: new Float64Array(columns.outputTokens),
		modelIndex: new Uint16Array(columns.modelIndex),
		models: columns.models.slice()
	};
}

function inflate(columns) {
	const count = columns.timestamps.length;
	const points = new Array(count);
	for (let index = 0; index < count; index += 1) {
		const cost = columns.costs[index];
		points[index] = {
			date: new Date(columns.timestamps[index]).toISOString(),
			model: columns.models[columns.modelIndex[index]],
			cost: Number.isNaN(cost) ? null : cost,
			tokens: columns.tokens[index],
			inputWithCacheWrite: columns.inputWithCacheWrite[index],
			inputWithoutCacheWrite: columns.inputWithoutCacheWrite[index],
			cacheRead: columns.cacheRead[index],
			outputTokens: columns.outputTokens[index]
		};
	}
	return points;
}

function sumTokensObjects(points) {
	let sum = 0;
	for (const point of points) sum += point.tokens;
	return sum;
}

function sumTokensColumns(columns) {
	let sum = 0;
	const tokens = columns.tokens;
	for (let index = 0; index < tokens.length; index += 1) sum += tokens[index];
	return sum;
}

function groupByDayObjects(points) {
	const byDay = new Map();
	for (const point of points) {
		const day = point.date.slice(0, 10);
		byDay.set(day, (byDay.get(day) ?? 0) + point.tokens);
	}
	return byDay.size;
}

function groupByDayColumns(columns) {
	const byDay = new Map();
	const { timestamps, tokens } = columns;
	for (let index = 0; index < timestamps.length; index += 1) {
		const day = Math.floor(timestamps[index] / 86_400_000);
		byDay.set(day, (byDay.get(day) ?? 0) + tokens[index]);
	}
	return byDay.size;
}

function median(values) {
	const sorted = [...values].sort((left, right) => left - right);
	return sorted[Math.floor(sorted.length / 2)];
}

function timeMs(fn, iterations = ITERATIONS) {
	for (let index = 0; index < WARMUP; index += 1) fn();
	const samples = [];
	for (let index = 0; index < iterations; index += 1) {
		const start = performance.now();
		fn();
		samples.push(performance.now() - start);
	}
	return median(samples);
}

function collectHeap() {
	if (typeof gc === 'function') gc();
	return process.memoryUsage();
}

function memoryTotal(usage) {
	return usage.heapUsed + usage.arrayBuffers;
}

function heapDelta(factory) {
	collectHeap();
	const before = collectHeap();
	const value = factory();
	collectHeap();
	const after = collectHeap();
	return {
		heapBytes: Math.max(0, after.heapUsed - before.heapUsed),
		arrayBufferBytes: Math.max(0, after.arrayBuffers - before.arrayBuffers),
		bytes: Math.max(0, memoryTotal(after) - memoryTotal(before)),
		value
	};
}

function serializeBytes(value) {
	return v8.serialize(value).byteLength;
}

const workerSource = `
const { parentPort } = require('node:worker_threads');
const MODELS = ${JSON.stringify(MODELS)};
let heldPoints;
let heldColumns;

function makePoints(count) {
  const points = new Array(count);
  const start = Date.parse('2025-01-01T00:00:00.000Z');
  for (let index = 0; index < count; index += 1) {
    const timestamp = start + index * 60000;
    points[index] = {
      date: new Date(timestamp).toISOString(),
      model: MODELS[index % MODELS.length],
      cost: index % 5 === 0 ? null : (index % 100) + 0.34,
      tokens: 1000 + (index % 50000),
      inputWithCacheWrite: index % 10000,
      inputWithoutCacheWrite: index % 500,
      cacheRead: index % 200000,
      outputTokens: index % 8000
    };
  }
  return points;
}

function toColumns(points) {
  const count = points.length;
  const timestamps = new Float64Array(count);
  const costs = new Float64Array(count);
  const tokens = new Float64Array(count);
  const inputWithCacheWrite = new Float64Array(count);
  const inputWithoutCacheWrite = new Float64Array(count);
  const cacheRead = new Float64Array(count);
  const outputTokens = new Float64Array(count);
  const modelIndex = new Uint16Array(count);
  const models = [];
  const modelMap = new Map();
  for (let index = 0; index < count; index += 1) {
    const point = points[index];
    timestamps[index] = Date.parse(point.date);
    costs[index] = point.cost === null ? Number.NaN : point.cost;
    tokens[index] = point.tokens;
    inputWithCacheWrite[index] = point.inputWithCacheWrite;
    inputWithoutCacheWrite[index] = point.inputWithoutCacheWrite;
    cacheRead[index] = point.cacheRead;
    outputTokens[index] = point.outputTokens;
    let interned = modelMap.get(point.model);
    if (interned === undefined) {
      interned = models.length;
      modelMap.set(point.model, interned);
      models.push(point.model);
    }
    modelIndex[index] = interned;
  }
  return { timestamps, costs, tokens, inputWithCacheWrite, inputWithoutCacheWrite, cacheRead, outputTokens, modelIndex, models };
}

parentPort.on('message', (message) => {
  if (message.mode === 'prepare-points') {
    heldPoints = makePoints(message.count);
    parentPort.postMessage({ type: 'ready' });
    return;
  }
  if (message.mode === 'prepare-columns') {
    heldColumns = toColumns(makePoints(message.count));
    parentPort.postMessage({ type: 'ready' });
    return;
  }
  if (message.mode === 'clone-points') {
    parentPort.postMessage({ type: 'success', points: heldPoints });
    return;
  }
  if (message.mode === 'clone-columns') {
    parentPort.postMessage({ type: 'success', columns: heldColumns });
    return;
  }
  if (message.mode === 'transfer-columns') {
    const columns = heldColumns;
    heldColumns = null;
    parentPort.postMessage({ type: 'success', columns }, [
      columns.timestamps.buffer,
      columns.costs.buffer,
      columns.tokens.buffer,
      columns.inputWithCacheWrite.buffer,
      columns.inputWithoutCacheWrite.buffer,
      columns.cacheRead.buffer,
      columns.outputTokens.buffer,
      columns.modelIndex.buffer
    ]);
  }
});
`;

function createProbeWorker() {
	const worker = new Worker(workerSource, { eval: true });
	return {
		roundTrip(payload, transfer = []) {
			return new Promise((resolve, reject) => {
				const start = performance.now();
				const onMessage = () => {
					worker.off('error', onError);
					resolve(performance.now() - start);
				};
				const onError = (error) => {
					worker.off('message', onMessage);
					reject(error);
				};
				worker.once('message', onMessage);
				worker.once('error', onError);
				worker.postMessage(payload, transfer);
			});
		},
		terminate() {
			return worker.terminate();
		}
	};
}

async function timeRoundTrip(run, iterations = 5) {
	for (let index = 0; index < 2; index += 1) await run();
	const samples = [];
	for (let index = 0; index < iterations; index += 1) {
		samples.push(await run());
	}
	return median(samples);
}

function formatMb(bytes) {
	return `${(bytes / 1_048_576).toFixed(2)} MB`;
}

function formatMs(ms) {
	return `${ms.toFixed(2)} ms`;
}

const rows = [];
const worker = createProbeWorker();

for (const count of ROW_COUNTS) {
	const points = makePoints(count);
	const columns = toColumns(points);

	const objectHeap = heapDelta(() => makePoints(count));
	const columnHeap = heapDelta(() => toColumns(makePoints(count)));

	const objectCloneMs = timeMs(() => structuredClone(points));
	const columnCloneMs = timeMs(() => structuredClone(columns));
	const memcpyMs = timeMs(() => cloneColumns(columns));
	const inflateMs = timeMs(() => inflate(columns));
	const objectSumMs = timeMs(() => sumTokensObjects(points));
	const columnSumMs = timeMs(() => sumTokensColumns(columns));
	const objectGroupMs = timeMs(() => groupByDayObjects(points));
	const columnGroupMs = timeMs(() => groupByDayColumns(columns));

	const objectSerialize = serializeBytes({ type: 'success', points });
	const columnSerialize = serializeBytes({ type: 'success', columns });

	await worker.roundTrip({ mode: 'prepare-points', count });
	const clonePointsMs = await timeRoundTrip(() => worker.roundTrip({ mode: 'clone-points' }));
	await worker.roundTrip({ mode: 'prepare-columns', count });
	const cloneColumnsMs = await timeRoundTrip(() => worker.roundTrip({ mode: 'clone-columns' }));
	const transferColumnsMs = await timeRoundTrip(async () => {
		await worker.roundTrip({ mode: 'prepare-columns', count });
		const start = performance.now();
		await worker.roundTrip({ mode: 'transfer-columns' });
		return performance.now() - start;
	});

	rows.push({
		count,
		objectHeapBytes: objectHeap.bytes,
		objectHeapOnlyBytes: objectHeap.heapBytes,
		columnHeapBytes: columnHeap.bytes,
		columnHeapOnlyBytes: columnHeap.heapBytes,
		columnArrayBufferBytes: columnHeap.arrayBufferBytes,
		columnPackedBytes: packedBytes(columns),
		columnDenseBytes: denseBytes(count),
		objectSerializeBytes: objectSerialize,
		columnSerializeBytes: columnSerialize,
		objectCloneMs,
		columnCloneMs,
		memcpyMs,
		inflateMs,
		objectSumMs,
		columnSumMs,
		objectGroupMs,
		columnGroupMs,
		clonePointsMs,
		cloneColumnsMs,
		transferColumnsMs
	});
}

await worker.terminate();

const report = {
	node: process.version,
	note: 'Worker is reused so times exclude startup. clone-points matches csv-parser.worker.ts. Heap total is heapUsed + arrayBuffers.',
	rows
};

console.log(JSON.stringify(report, null, 2));
console.log('\nMarkdown table\n');
console.log(
	'| Rows | Object live | Column live | f64 SoA | Dense SoA | Clone payload objects | Clone payload columns | structuredClone objects | structuredClone columns | memcpy columns | Inflate to objects | Worker clone objects | Worker clone columns | Worker transfer columns | Sum objects | Sum columns | Group objects | Group columns |'
);
console.log(
	'| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'
);
for (const row of rows) {
	console.log(
		`| ${row.count.toLocaleString('en-US')} | ${formatMb(row.objectHeapBytes)} | ${formatMb(row.columnHeapBytes)} | ${formatMb(row.columnPackedBytes)} | ${formatMb(row.columnDenseBytes)} | ${formatMb(row.objectSerializeBytes)} | ${formatMb(row.columnSerializeBytes)} | ${formatMs(row.objectCloneMs)} | ${formatMs(row.columnCloneMs)} | ${formatMs(row.memcpyMs)} | ${formatMs(row.inflateMs)} | ${formatMs(row.clonePointsMs)} | ${formatMs(row.cloneColumnsMs)} | ${formatMs(row.transferColumnsMs)} | ${formatMs(row.objectSumMs)} | ${formatMs(row.columnSumMs)} | ${formatMs(row.objectGroupMs)} | ${formatMs(row.columnGroupMs)} |`
	);
}

if (process.env.PROBE_OUT) {
	writeFileSync(process.env.PROBE_OUT, JSON.stringify(report, null, 2));
}
