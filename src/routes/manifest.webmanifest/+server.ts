import { asset, resolve } from '$app/paths';
import { m } from '$lib/paraglide/messages';
import { baseLocale, locales } from '$lib/paraglide/runtime';

const data = {
	name: m.page_title({}, { locale: baseLocale }),
	description: m.page_description({}, { locale: baseLocale }),
	description_localized: Object.fromEntries(
		locales.map((locale) => {
			return [locale, m.page_description({}, { locale })];
		})
	),
	categories: ['productivity', 'utilities'],
	start_url: resolve('/'),
	theme_color: '#13171f',
	background_color: '#13171f',
	display: 'standalone',
	display_override: ['standalone'],
	icons: [
		{
			src: asset('/icons/icon-192.png'),
			type: 'image/png',
			sizes: '192x192'
		},
		{
			src: asset('/icons/icon-512-mask.png'),
			type: 'image/png',
			sizes: '512x512',
			purpose: 'maskable'
		},
		{
			src: asset('/icons/icon-512.png'),
			type: 'image/png',
			sizes: '512x512'
		}
	]
};

export const prerender = true;

export async function GET() {
	return new Response(JSON.stringify(data), {
		headers: {
			'Content-Type': 'application/manifest+json'
		}
	});
}
