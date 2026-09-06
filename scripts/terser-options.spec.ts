import { minify } from 'terser';
import { describe, expect, it } from 'vitest';
import { dropConsole, terserOptions } from '../terser-options.ts';

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
