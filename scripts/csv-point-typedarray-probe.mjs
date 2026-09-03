/**
 * Probe on current main: after #52 the worker posts DashboardData, not CsvPoint[].
 * Does a TypedArray CsvPoint layout still cut copies or worker-internal cost?
 *
 * Run: node --expose-gc scripts/csv-point-typedarray-probe.mjs
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

const DAY_RANGES = [1, 7, 'all'];
const ROW_COUNTS = [1_000, 10_000, 50_000, 100_000];
const ITERATIONS = 7;
const WARMUP = 2;
const MS_PER_DAY = 86_400_000;

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

function utcDayFromIso(value) {
	return new Date(value).toISOString().slice(0, 10);
}

function filterPointsByDays(points, days) {
	if (days === 'all') return points;

	const endDay = utcDayFromIso(points[points.length - 1].date);
	const startDate = new Date(`${endDay}T00:00:00.000Z`);
	startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
	const startDay = startDate.toISOString().slice(0, 10);

	return points.filter((point) => {
		const day = utcDayFromIso(point.date);
		return day >= startDay && day <= endDay;
	});
}

function groupByDay(points) {
	const byDay = new Map();
	for (const point of points) {
		const day = utcDayFromIso(point.date);
		const dayValue = byDay.get(day) ?? { cost: 0, tokens: 0, models: new Map() };
		const modelValue = dayValue.models.get(point.model) ?? {
			model: point.model,
			cost: 0,
			tokens: 0
		};
		const cost = point.cost ?? 0;
		dayValue.cost += cost;
		dayValue.tokens += point.tokens;
		modelValue.cost += cost;
		modelValue.tokens += point.tokens;
		dayValue.models.set(point.model, modelValue);
		byDay.set(day, dayValue);
	}

	return Array.from(byDay.entries())
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([day, value]) => ({
			day,
			cost: value.cost,
			tokens: value.tokens,
			models: Array.from(value.models.values()).sort((left, right) =>
				left.model.localeCompare(right.model)
			)
		}));
}

function groupByHour(points) {
	const tokensByHour = new Map();
	for (const point of points) {
		const timestamp = Date.parse(point.date);
		const hour = new Date(timestamp).getHours();
		tokensByHour.set(hour, (tokensByHour.get(hour) ?? 0) + point.tokens);
	}
	return Array.from({ length: 24 }, (_, hour) => ({
		hour,
		tokens: tokensByHour.get(hour) ?? 0
	}));
}

function groupByModelBreakdown(points) {
	const byModel = new Map();
	for (const point of points) {
		const value = byModel.get(point.model) ?? {
			model: point.model,
			cost: 0,
			tokens: 0,
			inputWithCacheWrite: 0,
			inputWithoutCacheWrite: 0,
			cacheRead: 0,
			outputTokens: 0
		};
		value.cost += point.cost ?? 0;
		value.tokens += point.tokens;
		value.inputWithCacheWrite += point.inputWithCacheWrite;
		value.inputWithoutCacheWrite += point.inputWithoutCacheWrite;
		value.cacheRead += point.cacheRead;
		value.outputTokens += point.outputTokens;
		byModel.set(point.model, value);
	}

	return Array.from(byModel.values()).sort((left, right) => left.model.localeCompare(right.model));
}

function buildDashboardFromPoints(points) {
	const ranges = {};
	for (const days of DAY_RANGES) {
		const filtered = filterPointsByDays(points, days);
		ranges[days] = {
			byDay: groupByDay(filtered),
			byHour: groupByHour(filtered),
			byModelBreakdown: groupByModelBreakdown(filtered)
		};
	}

	let totalCost = 0;
	let totalTokens = 0;
	for (const point of points) {
		totalCost += point.cost ?? 0;
		totalTokens += point.tokens;
	}

	return { pointCount: points.length, totalCost, totalTokens, ranges };
}

function makeTimestampPoints(points) {
	return points.map((point) => ({
		...point,
		timestamp: Date.parse(point.date)
	}));
}

function utcDayFromTimestamp(timestamp) {
	return new Date(timestamp).toISOString().slice(0, 10);
}

function filterTimestampPointsByDays(points, days) {
	if (days === 'all') return points;

	const endDay = utcDayFromTimestamp(points[points.length - 1].timestamp);
	const startDate = new Date(`${endDay}T00:00:00.000Z`);
	startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
	const startTs = startDate.getTime();

	return points.filter((point) => point.timestamp >= startTs);
}

function buildDashboardFromTimestampPoints(points) {
	const ranges = {};
	for (const days of DAY_RANGES) {
		const filtered = filterTimestampPointsByDays(points, days);
		ranges[days] = {
			byDay: groupByDayTimestamps(filtered),
			byHour: groupByHourTimestamps(filtered),
			byModelBreakdown: groupByModelBreakdown(filtered)
		};
	}

	let totalCost = 0;
	let totalTokens = 0;
	for (const point of points) {
		totalCost += point.cost ?? 0;
		totalTokens += point.tokens;
	}

	return { pointCount: points.length, totalCost, totalTokens, ranges };
}

function groupByDayTimestamps(points) {
	const byDay = new Map();
	for (const point of points) {
		const day = utcDayFromTimestamp(point.timestamp);
		const dayValue = byDay.get(day) ?? { cost: 0, tokens: 0, models: new Map() };
		const modelValue = dayValue.models.get(point.model) ?? {
			model: point.model,
			cost: 0,
			tokens: 0
		};
		const cost = point.cost ?? 0;
		dayValue.cost += cost;
		dayValue.tokens += point.tokens;
		modelValue.cost += cost;
		modelValue.tokens += point.tokens;
		dayValue.models.set(point.model, modelValue);
		byDay.set(day, dayValue);
	}

	return Array.from(byDay.entries())
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([day, value]) => ({
			day,
			cost: value.cost,
			tokens: value.tokens,
			models: Array.from(value.models.values()).sort((left, right) =>
				left.model.localeCompare(right.model)
			)
		}));
}

function groupByHourTimestamps(points) {
	const tokensByHour = new Map();
	for (const point of points) {
		const hour = new Date(point.timestamp).getHours();
		tokensByHour.set(hour, (tokensByHour.get(hour) ?? 0) + point.tokens);
	}
	return Array.from({ length: 24 }, (_, hour) => ({
		hour,
		tokens: tokensByHour.get(hour) ?? 0
	}));
}

function sliceEnd(columns) {
	return columns.timestamps.length === 0
		? 0
		: Math.floor(columns.timestamps[columns.timestamps.length - 1] / MS_PER_DAY);
}

function columnRange(columns, days) {
	const end = columns.timestamps.length;
	if (days === 'all' || end === 0) return { start: 0, end };

	const endDay = sliceEnd(columns);
	const startTs = (endDay - (days - 1)) * MS_PER_DAY;
	let start = 0;
	let high = end;
	while (start < high) {
		const mid = (start + high) >>> 1;
		if (columns.timestamps[mid] < startTs) start = mid + 1;
		else high = mid;
	}
	return { start, end };
}

function buildDashboardFromColumns(columns) {
	const ranges = {};
	for (const days of DAY_RANGES) {
		const { start, end } = columnRange(columns, days);
		ranges[days] = {
			byDay: groupByDayColumns(columns, start, end),
			byHour: groupByHourColumns(columns, start, end),
			byModelBreakdown: groupByModelBreakdownColumns(columns, start, end)
		};
	}

	let totalCost = 0;
	let totalTokens = 0;
	for (let index = 0; index < columns.timestamps.length; index += 1) {
		const cost = columns.costs[index];
		if (!Number.isNaN(cost)) totalCost += cost;
		totalTokens += columns.tokens[index];
	}

	return {
		pointCount: columns.timestamps.length,
		totalCost,
		totalTokens,
		ranges
	};
}

function groupByDayColumns(columns, start, end) {
	const byDay = new Map();
	for (let index = start; index < end; index += 1) {
		const day = new Date(columns.timestamps[index]).toISOString().slice(0, 10);
		const model = columns.models[columns.modelIndex[index]];
		const dayValue = byDay.get(day) ?? { cost: 0, tokens: 0, models: new Map() };
		const modelValue = dayValue.models.get(model) ?? { model, cost: 0, tokens: 0 };
		const cost = Number.isNaN(columns.costs[index]) ? 0 : columns.costs[index];
		dayValue.cost += cost;
		dayValue.tokens += columns.tokens[index];
		modelValue.cost += cost;
		modelValue.tokens += columns.tokens[index];
		dayValue.models.set(model, modelValue);
		byDay.set(day, dayValue);
	}

	return Array.from(byDay.entries())
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([day, value]) => ({
			day,
			cost: value.cost,
			tokens: value.tokens,
			models: Array.from(value.models.values()).sort((left, right) =>
				left.model.localeCompare(right.model)
			)
		}));
}

function groupByHourColumns(columns, start, end) {
	const tokensByHour = new Map();
	for (let index = start; index < end; index += 1) {
		const hour = new Date(columns.timestamps[index]).getHours();
		tokensByHour.set(hour, (tokensByHour.get(hour) ?? 0) + columns.tokens[index]);
	}
	return Array.from({ length: 24 }, (_, hour) => ({
		hour,
		tokens: tokensByHour.get(hour) ?? 0
	}));
}

function groupByModelBreakdownColumns(columns, start, end) {
	const byModel = new Map();
	for (let index = start; index < end; index += 1) {
		const model = columns.models[columns.modelIndex[index]];
		const value = byModel.get(model) ?? {
			model,
			cost: 0,
			tokens: 0,
			inputWithCacheWrite: 0,
			inputWithoutCacheWrite: 0,
			cacheRead: 0,
			outputTokens: 0
		};
		const cost = Number.isNaN(columns.costs[index]) ? 0 : columns.costs[index];
		value.cost += cost;
		value.tokens += columns.tokens[index];
		value.inputWithCacheWrite += columns.inputWithCacheWrite[index];
		value.inputWithoutCacheWrite += columns.inputWithoutCacheWrite[index];
		value.cacheRead += columns.cacheRead[index];
		value.outputTokens += columns.outputTokens[index];
		byModel.set(model, value);
	}
	return Array.from(byModel.values()).sort((left, right) => left.model.localeCompare(right.model));
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
		bytes: Math.max(0, memoryTotal(after) - memoryTotal(before)),
		value
	};
}

function serializeBytes(value) {
	return v8.serialize(value).byteLength;
}

function dashboardShape(dashboard) {
	return {
		allDays: dashboard.ranges.all.byDay.length,
		allModels: dashboard.ranges.all.byModelBreakdown.length,
		range1Days: dashboard.ranges[1].byDay.length,
		range7Days: dashboard.ranges[7].byDay.length
	};
}

const workerSource = `
const { parentPort } = require('node:worker_threads');
let held;

parentPort.on('message', (message) => {
  if (message.mode.startsWith('prepare-')) {
    held = message.payload;
    parentPort.postMessage({ type: 'ready' });
    return;
  }
  if (message.mode === 'clone') {
    parentPort.postMessage({ type: 'success', payload: held });
  }
});
`;

function createProbeWorker() {
	const worker = new Worker(workerSource, { eval: true });
	return {
		roundTrip(payload) {
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
				worker.postMessage(payload);
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

function formatKb(bytes) {
	return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatMs(ms) {
	return `${ms.toFixed(2)} ms`;
}

const rows = [];
const worker = createProbeWorker();

for (const count of ROW_COUNTS) {
	const points = makePoints(count);
	const columns = toColumns(points);
	const timestampPoints = makeTimestampPoints(points);
	const dashboard = buildDashboardFromPoints(points);

	const objectHeap = heapDelta(() => makePoints(count));
	const columnHeap = heapDelta(() => toColumns(points));
	const dashboardHeap = heapDelta(() => buildDashboardFromPoints(points));

	const objectCloneMs = timeMs(() => structuredClone(points));
	const dashboardCloneMs = timeMs(() => structuredClone(dashboard));
	const columnCloneMs = timeMs(() => structuredClone(columns));
	const buildFromPointsMs = timeMs(() => buildDashboardFromPoints(points));
	const buildFromTimestampMs = timeMs(() => buildDashboardFromTimestampPoints(timestampPoints));
	const buildFromColumnsMs = timeMs(() => buildDashboardFromColumns(columns));

	const pointsSerialize = serializeBytes({ type: 'success', points });
	const dashboardSerialize = serializeBytes({ type: 'success', dashboard });
	const columnsSerialize = serializeBytes({ type: 'success', columns });

	await worker.roundTrip({ mode: 'prepare-points', payload: points });
	const clonePointsMs = await timeRoundTrip(() => worker.roundTrip({ mode: 'clone' }));
	await worker.roundTrip({ mode: 'prepare-dashboard', payload: dashboard });
	const cloneDashboardMs = await timeRoundTrip(() => worker.roundTrip({ mode: 'clone' }));
	await worker.roundTrip({ mode: 'prepare-columns', payload: columns });
	const cloneColumnsMs = await timeRoundTrip(() => worker.roundTrip({ mode: 'clone' }));

	rows.push({
		count,
		...dashboardShape(dashboard),
		objectHeapBytes: objectHeap.bytes,
		columnHeapBytes: columnHeap.bytes,
		columnPackedBytes: packedBytes(columns),
		dashboardHeapBytes: dashboardHeap.bytes,
		pointsSerializeBytes: pointsSerialize,
		dashboardSerializeBytes: dashboardSerialize,
		columnsSerializeBytes: columnsSerialize,
		objectCloneMs,
		dashboardCloneMs,
		columnCloneMs,
		buildFromPointsMs,
		buildFromTimestampMs,
		buildFromColumnsMs,
		clonePointsMs,
		cloneDashboardMs,
		cloneColumnsMs
	});
}

await worker.terminate();

const report = {
	node: process.version,
	note: 'Current main (#52) posts DashboardData. clone-points is the pre-#52 path. Timestamp-field objects keep Date.parse results on CsvPoint without SoA.',
	rows
};

console.log(JSON.stringify(report, null, 2));
console.log('\nMarkdown table\n');
console.log(
	'| Rows | Unique days (all) | Object live | Column live | Dashboard live | Clone payload points | Clone payload dashboard | Worker clone points (old) | Worker clone dashboard (current) | Build dashboard from date strings | Build dashboard from timestamp field | Build dashboard from columns |'
);
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const row of rows) {
	console.log(
		`| ${row.count.toLocaleString('en-US')} | ${row.allDays} | ${formatMb(row.objectHeapBytes)} | ${formatMb(row.columnHeapBytes)} | ${formatKb(row.dashboardHeapBytes)} | ${formatMb(row.pointsSerializeBytes)} | ${formatKb(row.dashboardSerializeBytes)} | ${formatMs(row.clonePointsMs)} | ${formatMs(row.cloneDashboardMs)} | ${formatMs(row.buildFromPointsMs)} | ${formatMs(row.buildFromTimestampMs)} | ${formatMs(row.buildFromColumnsMs)} |`
	);
}

if (process.env.PROBE_OUT) {
	writeFileSync(process.env.PROBE_OUT, JSON.stringify(report, null, 2));
}
