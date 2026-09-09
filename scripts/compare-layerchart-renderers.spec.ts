import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
	filesWithLayerchartRendererImports,
	measureHtmlBundle,
	measureInlineScripts,
	RENDERERS,
	rewriteLayerchartRenderer
} from './compare-layerchart-renderers.mjs';

describe('rewriteLayerchartRenderer', () => {
	it('rewrites every layerchart renderer import to the requested subpath', () => {
		const source = [
			"import { BarChart, Tooltip } from 'layerchart/svg';",
			"import { Calendar, Chart, Layer, Rect } from 'layerchart/html';",
			"import { getChartImageBlob } from 'layerchart/utils/download';"
		].join('\n');

		expect(rewriteLayerchartRenderer(source, 'canvas')).toBe(
			[
				"import { BarChart, Tooltip } from 'layerchart/canvas';",
				"import { Calendar, Chart, Layer, Rect } from 'layerchart/canvas';",
				"import { getChartImageBlob } from 'layerchart/utils/download';"
			].join('\n')
		);
	});
});

describe('filesWithLayerchartRendererImports', () => {
	it('finds the shared renderer re-export, not the chart components', () => {
		const files = filesWithLayerchartRendererImports().map((file) => file.split('/').at(-1));

		expect(files).toEqual(['layerchart.ts']);
	});
});

describe('measureHtmlBundle', () => {
	it('sums raw and gzip-9 sizes of every HTML file', () => {
		const dir = mkdtempSync(join(tmpdir(), 'layerchart-bundle-'));
		mkdirSync(join(dir, 'en'));
		const index = Buffer.from('<html>small</html>');
		const locale = Buffer.from('<html>' + 'x'.repeat(2000) + '</html>');
		writeFileSync(join(dir, 'index.html'), index);
		writeFileSync(join(dir, 'en/index.html'), locale);

		expect(measureHtmlBundle(dir)).toEqual({
			htmlFiles: 2,
			bytes: index.byteLength + locale.byteLength,
			gzipBytes:
				gzipSync(index, { level: 9 }).byteLength + gzipSync(locale, { level: 9 }).byteLength,
			largest: {
				file: 'en/index.html',
				bytes: locale.byteLength,
				gzipBytes: gzipSync(locale, { level: 9 }).byteLength,
				scripts: measureInlineScripts(locale.toString('utf8'))
			}
		});
	});
});

describe('measureInlineScripts', () => {
	it('sums inline script bodies and their gzip-9 size', () => {
		const html =
			'<html><script type="module">const a=1;</script><script>const b=2;</script></html>';
		const joined = Buffer.from('const a=1;\nconst b=2;');

		expect(measureInlineScripts(html)).toEqual({
			count: 2,
			bytes: joined.byteLength,
			gzipBytes: gzipSync(joined, { level: 9 }).byteLength
		});
	});
});

describe('RENDERERS', () => {
	it('compares the three LayerChart renderer subpaths', () => {
		expect(RENDERERS).toEqual(['svg', 'html', 'canvas']);
	});
});

describe('layerchart renderer', () => {
	it('re-exports from layerchart/svg, the smallest measured renderer', () => {
		const source = readFileSync(
			new URL('../src/lib/feature/top/graph/layerchart.ts', import.meta.url),
			'utf8'
		);
		expect(source).toMatch(/from 'layerchart\/svg'/);
		expect(source).not.toMatch(/from 'layerchart\/(html|canvas)'/);
	});
});
