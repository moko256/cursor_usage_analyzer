import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import {
	collectAncestorPids,
	freeListenPort,
	parseLsofPids,
	parseNetstatPids
} from './e2e-dev-server.mjs';

const children: ReturnType<typeof spawn>[] = [];

afterEach(() => {
	for (const child of children.splice(0)) {
		if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
	}
});

describe('parseLsofPids', () => {
	it('reads unique listening pids', () => {
		expect(parseLsofPids('7999\n7973\n7999\n')).toEqual([7999, 7973]);
		expect(parseLsofPids('')).toEqual([]);
	});
});

describe('parseNetstatPids', () => {
	it('reads the listener pid for the requested port', () => {
		const stdout = [
			'Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name',
			'tcp        0      0 127.0.0.1:4173          0.0.0.0:*               LISTEN      7999/node',
			'tcp        0      0 127.0.0.1:3000          0.0.0.0:*               LISTEN      1111/node'
		].join('\n');

		expect(parseNetstatPids(stdout, 4173)).toEqual([7999]);
	});
});

describe('collectAncestorPids', () => {
	it('walks node/pnpm parents and stops on other commands', () => {
		const ppid = new Map([
			[10, 20],
			[20, 30],
			[30, 1]
		]);
		const cmd = new Map([
			[20, '/usr/bin/pnpm dev --port 4173'],
			[30, '/usr/sbin/init']
		]);

		expect(
			collectAncestorPids(
				10,
				(pid) => ppid.get(pid) ?? 0,
				(pid) => cmd.get(pid) ?? ''
			)
		).toEqual([10, 20]);
	});
});

describe('e2e-dev-server --stop', () => {
	it('exits after freeing the port', async () => {
		const child = spawn(process.execPath, ['./scripts/e2e-dev-server.mjs', '--stop'], {
			stdio: 'ignore'
		});
		children.push(child);

		const code = await new Promise<number | null>((resolve) => {
			child.once('exit', (exitCode) => resolve(exitCode));
		});

		expect(code).toBe(0);
	});
});

describe('freeListenPort', () => {
	it('stops a child listener so the port can be bound again', async () => {
		const port = await unusedPort();
		const child = spawn(
			process.execPath,
			['-e', `require('http').createServer().listen(${port}, '127.0.0.1')`],
			{ stdio: 'ignore' }
		);
		children.push(child);
		await waitForListen(port);

		const stopped = await freeListenPort(port);
		expect(stopped).toContain(child.pid);

		await expect(listenOn(port)).resolves.toBeUndefined();
	});
});

function unusedPort() {
	return new Promise<number>((resolve, reject) => {
		const server = createServer();
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			if (!address || typeof address === 'string') {
				server.close();
				reject(new Error('expected a tcp address'));
				return;
			}

			const { port } = address;
			server.close((error) => {
				if (error) reject(error);
				else resolve(port);
			});
		});
	});
}

function waitForListen(port: number) {
	return new Promise<void>((resolve, reject) => {
		const deadline = Date.now() + 3_000;

		const attempt = () => {
			const server = createServer();
			server.once('error', (error: NodeJS.ErrnoException) => {
				if (error.code === 'EADDRINUSE') {
					resolve();
					return;
				}

				if (Date.now() > deadline) reject(error);
				else setTimeout(attempt, 25);
			});
			server.listen(port, '127.0.0.1', () => {
				server.close(() => {
					if (Date.now() > deadline) reject(new Error(`nothing listened on ${port}`));
					else setTimeout(attempt, 25);
				});
			});
		};

		attempt();
	});
}

function listenOn(port: number) {
	return new Promise<void>((resolve, reject) => {
		const server = createServer();
		server.listen(port, '127.0.0.1', () => {
			server.close((error) => {
				if (error) reject(error);
				else resolve();
			});
		});
		server.once('error', reject);
	});
}
