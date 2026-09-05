import { describe, expect, it } from 'vitest';
import { siteBase, siteHost, siteProtocol } from '../../site-url';
import { applyDocumentLocale } from './html-lang';

function pageUrl(locale: string): URL {
	return new URL(`${siteProtocol}://${siteHost}${siteBase}/${locale}/`);
}

describe('applyDocumentLocale', () => {
	it.each([
		['en', 'ltr'],
		['ja', 'ltr']
	] as const)('sets lang=%s and dir=%s from the localized URL', (locale, dir) => {
		const root = { lang: 'xx', dir: 'rtl' };

		expect(applyDocumentLocale(root, pageUrl(locale))).toBe(locale);
		expect(root.lang).toBe(locale);
		expect(root.dir).toBe(dir);
	});
});
