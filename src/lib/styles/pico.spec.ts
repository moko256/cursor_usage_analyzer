import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import { describe, expect, it } from 'vitest';

const entry = fileURLToPath(new URL('./pico.scss', import.meta.url));
const fullPicoPath = fileURLToPath(
	new URL('../../../node_modules/@picocss/pico/css/pico.blue.min.css', import.meta.url)
);

describe('custom Pico stylesheet', () => {
	const css = compile(entry, {
		style: 'compressed',
		loadPaths: ['node_modules'],
		quietDeps: true
	}).css;
	const fullPico = readFileSync(fullPicoPath, 'utf8');

	it('is smaller than the full blue theme stylesheet', () => {
		expect(css.length, `custom ${css.length}B vs full ${fullPico.length}B`).toBeLessThan(
			fullPico.length
		);
		expect(css.length / fullPico.length).toBeLessThan(0.75);
	});

	it('keeps styles used by the app', () => {
		expect(css).toContain('.container');
		expect(css).toContain('[role=group]');
		expect(css).toContain('article{');
		expect(css).toContain('progress{');
		expect(css).toContain('nav,nav ul{');
		expect(css).toContain('button{');
		expect(css).toContain('code,kbd,samp{');
		expect(css).toContain('figure{');
	});

	it('omits unused Pico modules', () => {
		expect(css).not.toContain('[data-tooltip]');
		expect(css).not.toContain('dialog>');
		expect(css).not.toContain('details.dropdown');
		expect(css).not.toContain('.overflow-auto');
		expect(css).not.toContain('table.striped');
		expect(css).not.toContain('[role=switch]');
		expect(css).not.toContain('--pico-icon-loading');
		expect(css).not.toMatch(/(^|[^\w-])\.grid\{/);
	});
});
