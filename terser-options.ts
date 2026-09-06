import type { MinifyOptions } from 'terser';

/** Console methods stripped from production bundles. `console.error` is kept. */
export const dropConsole = [
	'assert',
	'clear',
	'count',
	'countReset',
	'debug',
	'dir',
	'dirxml',
	'group',
	'groupCollapsed',
	'groupEnd',
	'info',
	'log',
	'profile',
	'profileEnd',
	'table',
	'time',
	'timeEnd',
	'timeLog',
	'timeStamp',
	'trace',
	'warn'
] as const satisfies ReadonlyArray<keyof typeof console>;

export const terserOptions = {
	compress: {
		drop_console: [...dropConsole]
	}
} satisfies MinifyOptions;
