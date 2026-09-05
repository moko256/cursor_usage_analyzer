import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const e2eDevHost = '127.0.0.1';
export const e2eDevPort = Number(process.env.E2E_DEV_PORT ?? 4173);
export const e2eDevOrigin = `http://${e2eDevHost}:${e2eDevPort}`;

const serverCommand = ['pnpm', 'dev', '--host', e2eDevHost, '--port', String(e2eDevPort)];

export function parseLsofPids(stdout) {
	return uniquePids(
		stdout
			.trim()
			.split(/\s+/)
			.filter(Boolean)
			.map(Number)
			.filter((pid) => Number.isInteger(pid) && pid > 0)
	);
}

export function parseNetstatPids(stdout, port) {
	const pattern = new RegExp(`[:.]${port}\\s+\\S+\\s+LISTEN\\s+(\\d+)/`, 'g');
	const pids = [];

	for (const match of stdout.matchAll(pattern)) {
		pids.push(Number(match[1]));
	}

	return uniquePids(pids);
}

export function collectAncestorPids(pid, readPpid, readCmdline) {
	const pids = [pid];
	let current = pid;

	for (let depth = 0; depth < 6; depth += 1) {
		const parent = readPpid(current);
		if (!parent || parent <= 1) break;

		const cmdline = readCmdline(parent);
		if (!/(?:^|\/)(?:node|pnpm|npm|vite)(?:\s|$)/.test(cmdline)) break;

		pids.push(parent);
		current = parent;
	}

	return uniquePids(pids);
}

export function listenPids(port) {
	try {
		const stdout = execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore']
		});
		return parseLsofPids(stdout);
	} catch (error) {
		if (error.status === 1) return [];
	}

	try {
		const stdout = execFileSync('netstat', ['-tlnp'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore']
		});
		return parseNetstatPids(stdout, port);
	} catch {
		return [];
	}
}

export async function freeListenPort(
	port,
	{ kill = process.kill, sleep = delay, pidsForPort = listenPids } = {}
) {
	const listeners = pidsForPort(port);
	if (listeners.length === 0) return [];

	const tree = uniquePids(
		listeners.flatMap((pid) =>
			collectAncestorPids(pid, readPpid, readCmdline).filter(
				(candidate) => candidate !== process.pid && candidate !== process.ppid
			)
		)
	);

	for (const pid of tree) {
		try {
			kill(pid, 'SIGTERM');
		} catch {
			// Already gone.
		}
	}

	const deadline = Date.now() + 3_000;
	while (Date.now() < deadline) {
		if (pidsForPort(port).length === 0) return tree;
		await sleep(50);
	}

	for (const pid of pidsForPort(port)) {
		if (pid === process.pid || pid === process.ppid) continue;
		try {
			kill(pid, 'SIGKILL');
		} catch {
			// Already gone.
		}
	}

	return tree;
}

function uniquePids(pids) {
	return [...new Set(pids.filter((pid) => Number.isInteger(pid) && pid > 0))];
}

function readPpid(pid) {
	try {
		const status = readFileSync(`/proc/${pid}/status`, 'utf8');
		return Number(/^PPid:\s+(\d+)/m.exec(status)?.[1] ?? 0);
	} catch {
		return 0;
	}
}

function readCmdline(pid) {
	try {
		return readFileSync(`/proc/${pid}/cmdline`, 'utf8').replaceAll('\0', ' ').trim();
	} catch {
		return '';
	}
}

function delay(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

function isDirectRun() {
	const entry = process.argv[1]?.replaceAll('\\', '/');
	return Boolean(entry?.endsWith('scripts/e2e-dev-server.mjs'));
}

if (isDirectRun()) {
	const stopped = await freeListenPort(e2eDevPort);
	if (stopped.length > 0) {
		console.log(`Stopped stale dev server on ${e2eDevOrigin} (pids ${stopped.join(', ')})`);
	}

	if (process.argv.includes('--stop')) {
		process.exit(0);
	}

	const child = spawn(serverCommand[0], serverCommand.slice(1), {
		stdio: 'inherit',
		env: { ...process.env, E2E: '1' }
	});

	for (const signal of ['SIGINT', 'SIGTERM']) {
		process.on(signal, () => {
			child.kill(signal);
		});
	}

	child.on('exit', (code, signal) => {
		if (signal) process.kill(process.pid, signal);
		process.exit(code ?? 1);
	});
}
