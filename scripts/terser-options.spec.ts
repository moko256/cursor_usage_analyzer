import { minify } from 'terser';
import { describe, expect, it } from 'vitest';
import { dropConsole, terserMinifyPlugin, terserOptions } from '../terser-options.ts';

describe('terserOptions', () => {
	it('drops every console method except error', async () => {
		const source = [
			...dropConsole.map((method) => `console.${method}("drop");`),
			'console.error("keep");'
		].join('\n');

		const { code } = await minify(source, terserOptions);

		expect(code).toBeDefined();
		for (const method of dropConsole) {
			expect(code, `console.${method} should be dropped`).not.toContain(`console.${method}`);
		}
		expect(code).toContain('console.error("keep")');
	});
});

describe('terserMinifyPlugin', () => {
	it('minifies ESM chunks that contain import statements', async () => {
		const plugin = terserMinifyPlugin();
		const renderChunk = plugin.renderChunk;
		expect(typeof renderChunk).toBe('function');
		if (typeof renderChunk !== 'function') return;

		const result = await renderChunk.call(
			{},
			'import { x } from "./x.js";\nconsole.log(x);\nconsole.error(x);\n',
			{ fileName: 'chunk.js', type: 'chunk', isEntry: false } as never,
			{ format: 'es' } as never
		);

		expect(result).toEqual(expect.objectContaining({ code: expect.any(String) }));
		expect(result && 'code' in result ? result.code : '').not.toContain('console.log');
		expect(result && 'code' in result ? result.code : '').toContain('console.error');
	});
});
