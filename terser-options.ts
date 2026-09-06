import { minify } from 'terser';
import type { MinifyOptions } from 'terser';
import type { Plugin } from 'vite';

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
	// Vite targets Baseline Widely Available; skip the Safari 10 workaround.
	safari10: false,
	ecma: 2020,
	compress: {
		drop_console: [...dropConsole],
		ecma: 2020,
		passes: 2,
		toplevel: true,
		unsafe_arrows: true,
		unsafe_methods: true
	},
	mangle: {
		toplevel: true
	},
	format: {
		comments: false,
		ecma: 2020,
		safari10: false
	}
} satisfies MinifyOptions;

/** Runs after Oxc minify so Terser can drop console.* and shrink inlined HTML. */
export function terserMinifyPlugin(): Plugin {
	return {
		name: 'terser-minify',
		apply: 'build',
		enforce: 'post',
		applyToEnvironment(environment) {
			// Static HTML inlines the client bundle. Skip SSR chunks.
			return environment.name !== 'ssr';
		},
		async renderChunk(code, _chunk, outputOptions) {
			const isModule = outputOptions.format === 'es' || outputOptions.format === 'esm';
			const result = await minify(code, {
				...terserOptions,
				module: isModule,
				compress: {
					...terserOptions.compress,
					module: isModule
				}
			});

			if (result.code == null) {
				throw new Error('Terser produced empty output');
			}

			return { code: result.code };
		}
	};
}
