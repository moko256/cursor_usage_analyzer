import { describe, expect, it } from 'vitest';
import { applyDocumentLocale } from './html-lang';

describe('applyDocumentLocale', () => {
	it.each([
		['en', 'ltr'],
		['ja', 'ltr']
	] as const)('sets lang=%s and dir=%s', (locale, dir) => {
		const root = { lang: 'xx', dir: 'rtl' };

		applyDocumentLocale(root, locale);
		expect(root.lang).toBe(locale);
		expect(root.dir).toBe(dir);
	});
});
