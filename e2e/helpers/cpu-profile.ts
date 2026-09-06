import { expect, type Page } from '@playwright/test';

export type SwitchProfile = {
	label: string;
	clickToPaintMs: number;
	clickToSettledMs: number;
	longTasks: { duration: number; startTime: number }[];
	longestTaskMs: number;
	totalBlockingMs: number;
	sampleTotalMs: number;
	programMs: number;
	idleMs: number;
	topSelf: { name: string; selfMs: number }[];
};

type CpuProfile = {
	nodes: {
		id: number;
		callFrame: { functionName: string; url: string; lineNumber: number };
		hitCount: number;
		children?: number[];
	}[];
	samples?: number[];
	timeDeltas?: number[];
	startTime: number;
	endTime: number;
};

export async function installLongTaskObserver(page: Page) {
	await page.addInitScript(() => {
		const tasks: { duration: number; startTime: number }[] = [];
		(globalThis as unknown as { __longTasks: typeof tasks }).__longTasks = tasks;
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				tasks.push({ duration: entry.duration, startTime: entry.startTime });
			}
		}).observe({ type: 'longtask', buffered: true });
	});
}

export async function profileRangeSwitch(
	page: Page,
	options: { buttonName: string; label: string }
): Promise<SwitchProfile> {
	const button = page.getByRole('group', { name: 'Chart date range' }).getByRole('button', {
		name: options.buttonName
	});
	const client = await page.context().newCDPSession(page);
	await client.send('Profiler.enable');
	await client.send('Profiler.setSamplingInterval', { interval: 100 });

	const windowStart = await page.evaluate(() => {
		const mark = `range-switch-${performance.now()}`;
		performance.mark(mark);
		return { mark, timeOrigin: performance.timeOrigin, now: performance.now() };
	});

	const previousAria =
		(await page
			.getByRole('img', { name: /Daily token count by model/ })
			.getAttribute('aria-label')) ?? '';

	await client.send('Profiler.start');
	const clickStarted = Date.now();
	await button.click();
	await expect(button).toHaveAttribute('aria-current', 'true');
	await expect(page.getByRole('img', { name: /Daily token count by model/ })).not.toHaveAttribute(
		'aria-label',
		previousAria
	);

	const clickToPaintMs = await page.evaluate(
		() =>
			new Promise<number>((resolve) => {
				const started = performance.now();
				requestAnimationFrame(() => {
					requestAnimationFrame(() => resolve(performance.now() - started));
				});
			})
	);

	const clickToSettledMs = Date.now() - clickStarted;
	const { profile } = (await client.send('Profiler.stop')) as { profile: CpuProfile };
	await client.detach();

	const longTasks = await page.evaluate((mark) => {
		performance.measure('range-switch', mark);
		const measure = performance.getEntriesByName('range-switch').at(-1);
		const start = measure?.startTime ?? 0;
		const end = start + (measure?.duration ?? 0);
		const tasks = (
			globalThis as unknown as { __longTasks: { duration: number; startTime: number }[] }
		).__longTasks;
		return tasks.filter((task) => task.startTime >= start - 16 && task.startTime <= end + 50);
	}, windowStart.mark);

	const { topSelf, sampleTotalMs, programMs, idleMs } = summarizeCpuProfile(profile);
	const longestTaskMs = longTasks.reduce((max, task) => Math.max(max, task.duration), 0);
	const totalBlockingMs = longTasks.reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0);

	return {
		label: options.label,
		clickToPaintMs: roundMs(clickToPaintMs),
		clickToSettledMs,
		longTasks,
		longestTaskMs: roundMs(longestTaskMs),
		totalBlockingMs: roundMs(totalBlockingMs),
		sampleTotalMs,
		programMs,
		idleMs,
		topSelf
	};
}

export function summarizeCpuProfile(profile: CpuProfile) {
	const selfMs = new Map<string, number>();
	const nodes = new Map<
		number,
		{ name: string; functionName: string; url: string; lineNumber: number }
	>();

	for (const node of profile.nodes) {
		const functionName = node.callFrame.functionName || '(anonymous)';
		const url = node.callFrame.url;
		const lineNumber = node.callFrame.lineNumber;
		nodes.set(node.id, {
			name: formatProfileName(functionName, url, lineNumber),
			functionName,
			url,
			lineNumber
		});
	}

	let sampleTotalMs = 0;
	let programMs = 0;
	let idleMs = 0;
	const samples = profile.samples ?? [];
	const deltas = profile.timeDeltas ?? [];

	for (let index = 0; index < samples.length; index += 1) {
		const deltaMs = (deltas[index] ?? 0) / 1000;
		sampleTotalMs += deltaMs;
		const node = nodes.get(samples[index]);
		if (!node) continue;
		if (node.functionName === '(idle)') {
			idleMs += deltaMs;
			continue;
		}
		if (node.functionName === '(program)' || node.functionName === '(garbage collector)') {
			programMs += deltaMs;
		}
		selfMs.set(node.name, (selfMs.get(node.name) ?? 0) + deltaMs);
	}

	const topSelf = [...selfMs.entries()]
		.sort((left, right) => right[1] - left[1])
		.slice(0, 15)
		.map(([name, ms]) => ({ name, selfMs: roundMs(ms) }));

	return {
		topSelf,
		sampleTotalMs: roundMs(sampleTotalMs),
		programMs: roundMs(programMs),
		idleMs: roundMs(idleMs)
	};
}

function formatProfileName(functionName: string, url: string, lineNumber: number) {
	const file = url.split('/').at(-1)?.split('?')[0];
	return file ? `${functionName} @ ${file}:${lineNumber}` : functionName;
}

export function roundMs(value: number) {
	return Math.round(value * 10) / 10;
}
