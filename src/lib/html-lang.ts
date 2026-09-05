import {
	baseLocale,
	extractLocaleFromUrl,
	getTextDirection,
	type Locale
} from '$lib/paraglide/runtime';

export function applyDocumentLocale(
	root: Pick<HTMLElement, 'lang' | 'dir'>,
	url: URL | string
): Locale {
	const locale = extractLocaleFromUrl(url) ?? baseLocale;
	root.lang = locale;
	root.dir = getTextDirection(locale);
	return locale;
}
