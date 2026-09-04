import { paraglideVitePlugin } from '@inlang/paraglide-js';
import type { CspDirectives } from '@sveltejs/kit';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import inlangSettings from './project.inlang/settings.json' with { type: 'json' };
import { siteBase, siteHost, siteProtocol } from './site-url.ts';

const productionCspDirectives = {
	'default-src': ['none'],
	'worker-src': ['blob:', 'data:']
} satisfies CspDirectives;

/** Vite's dev modules, HMR, and LayerChart's blob SVG rasterisation need extra sources. */
const e2eCspDirectives = {
	'default-src': ['none'],
	'script-src': ['self'],
	'connect-src': ['self'],
	'img-src': ['self', 'data:', 'blob:'],
	'worker-src': ['self', 'blob:', 'data:']
} satisfies CspDirectives;

export default defineConfig({
	css: {
		preprocessorOptions: {
			scss: {
				// Pico still parses disabled modules; their Sass `if()` calls warn on modern Sass.
				quietDeps: true
			}
		}
	},
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				fallback: '404.html'
			}),
			paths: {
				assets: `${siteProtocol}://${siteHost}`,
				base: siteBase
			},
			csp: {
				directives: process.env.E2E === '1' ? e2eCspDirectives : productionCspDirectives,
				mode: 'hash'
			},
			output: {
				bundleStrategy: 'inline'
			}
		}),

		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			strategy: ['url', 'preferredLanguage', 'baseLocale'],
			urlPatterns: [
				{
					pattern: `${siteBase}/:path(.*)?`,
					localized: inlangSettings.locales.map((lang) => {
						return [lang, `${siteBase}/${lang}/:path(.*)?`];
					})
				}
			]
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
