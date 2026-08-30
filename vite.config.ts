import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import inlangSettings from './project.inlang/settings.json' with { type: 'json' };

type BasePath = '' | `/${string}`;
const configuredBasePath = process.env.BASE_PATH ?? '';
const basePath: BasePath = configuredBasePath.startsWith('/')
	? (configuredBasePath as BasePath)
	: '';

export default defineConfig({
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
				base: basePath
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
					pattern: `${basePath}/:path(.*)?`,
					localized: inlangSettings.locales.map((lang) => {
						return [lang, `${basePath}/${lang}/:path(.*)?`];
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
