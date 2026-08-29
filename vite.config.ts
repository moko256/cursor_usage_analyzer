import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import inlangSettings from './project.inlang/settings.json' with { type: 'json' };

const configuredBasePath = process.env.BASE_PATH ?? '';
const basePath: '' | `/${string}` = configuredBasePath.startsWith('/')
	? (configuredBasePath as `/${string}`)
	: '';

const baseLocale = inlangSettings.baseLocale;
const translatedLocales = inlangSettings.locales.filter((locale) => locale !== baseLocale);

// `reroute` and the Paraglide middleware see pathnames that still carry the base
// path, so the patterns have to carry it too.
const urlPattern = (locale: string) =>
	`:protocol://:domain(.*)::port?${basePath}${locale === baseLocale ? '' : `/${locale}`}/:path(.*)?`;

// The base locale pattern matches any path, so it has to be tried last.
const localizedUrlPatterns = [...translatedLocales, baseLocale].map(
	(locale) => [locale, urlPattern(locale)] as [string, string]
);

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
			prerender: {
				crawl: false,
				entries: ['*', ...translatedLocales.map((locale) => `/${locale}` as const)]
			},
			paths: {
				base: basePath
			}
		}),

		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			strategy: ['url', 'baseLocale'],
			// Match SvelteKit's `trailingSlash: 'never'` so localized hrefs point at
			// the prerendered `/ja` page instead of `/ja/`.
			trailingSlash: 'never',
			urlPatterns: [
				{
					pattern: urlPattern(baseLocale),
					localized: localizedUrlPatterns
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
