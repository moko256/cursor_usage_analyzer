import type { CDPSession, Page } from '@playwright/test';

export type HeapUsage = {
	usedSize: number;
	totalSize: number;
};

async function withHeapSession<T>(page: Page, run: (client: CDPSession) => Promise<T>): Promise<T> {
	const client = await page.context().newCDPSession(page);
	try {
		await client.send('HeapProfiler.enable');
		return await run(client);
	} finally {
		await client.detach();
	}
}

/** Force V8 GC so retained CSV / Worker memory shows up (or disappears) in samples. */
export async function collectGarbage(page: Page, rounds = 3) {
	await withHeapSession(page, async (client) => {
		for (let index = 0; index < rounds; index += 1) {
			await client.send('HeapProfiler.collectGarbage');
		}
	});
}

export async function getHeapUsage(page: Page): Promise<HeapUsage> {
	return withHeapSession(page, async (client) => {
		await client.send('HeapProfiler.collectGarbage');
		return (await client.send('Runtime.getHeapUsage')) as HeapUsage;
	});
}

/** Full heap snapshot JSON (string table included) for marker searches. */
export async function takeHeapSnapshot(page: Page): Promise<string> {
	return withHeapSession(page, async (client) => {
		await client.send('HeapProfiler.collectGarbage');
		let snapshot = '';
		client.on('HeapProfiler.addHeapSnapshotChunk', (message) => {
			snapshot += message.chunk;
		});
		await client.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
		return snapshot;
	});
}

export function countNeedleInSnapshot(snapshot: string, needle: string): number {
	let count = 0;
	let index = 0;
	while ((index = snapshot.indexOf(needle, index)) !== -1) {
		count += 1;
		index += needle.length;
	}
	return count;
}

export function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}
