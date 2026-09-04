import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import inlangSettings from './project.inlang/settings.json' with { type: 'json' };
import { siteBase, siteHost, siteProtocol } from './site-url.ts';

export default defineConfig({
	css: {
		transformer: 'lightningcss',
		preprocessorOptions: {
			scss: {
				// Pico still parses disabled modules; their Sass `if()` calls warn on modern Sass.
				quietDeps: true
			}
		}
	},
	build: {
		cssMinify: 'lightningcss'
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
				directives: {
					'default-src': ['none'],
					'worker-src': ['blob:', 'data:']
				},
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
