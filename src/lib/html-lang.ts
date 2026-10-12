import { getTextDirection, type Locale } from '#lib/paraglide/runtime.js';

export function applyDocumentLocale(root: Pick<HTMLElement, 'lang' | 'dir'>, locale: Locale): void {
	root.lang = locale;
	root.dir = getTextDirection(locale);
}
