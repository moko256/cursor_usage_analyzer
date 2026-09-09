#!/usr/bin/env node
/**
 * Build the static site once per LayerChart renderer (`svg`, `html`, `canvas`)
 * and report the inlined HTML size. Restores the original imports afterwards.
 *
 * Usage: node ./scripts/compare-layerchart-renderers.mjs
 */
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RENDERERS = ['svg', 'html', 'canvas'];

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = join(scriptDir, '..');
const graphDir = join(repositoryRoot, 'src/lib/feature/top/graph');
const svelteKitClientDir = join(repositoryRoot, '.svelte-kit/output/client/_app/immutable');

function layerchartImportPattern() {
	return /from 'layerchart\/(svg|html|canvas)'/g;
}

export function filesWithLayerchartRendererImports(dir = graphDir) {
	return readdirSync(dir)
		.filter((name) => name.endsWith('.svelte') || name.endsWith('.ts'))
		.map((name) => join(dir, name))
		.filter((file) => layerchartImportPattern().test(readFileSync(file, 'utf8')));
}

export function rewriteLayerchartRenderer(source, renderer) {
	return source.replaceAll(layerchartImportPattern(), `from 'layerchart/${renderer}'`);
}

export function collectHtmlFiles(dir, files = []) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) collectHtmlFiles(path, files);
		else if (entry.isFile() && entry.name.endsWith('.html')) files.push(path);
	}
	return files;
}

function gzipBytesOf(buffer) {
	return gzipSync(buffer, { level: 9 }).byteLength;
}

function measureNamedAssets(dir, test) {
	try {
		const matches = readdirSync(dir)
			.filter(test)
			.map((name) => {
				const buffer = readFileSync(join(dir, name));
				return { file: name, bytes: buffer.byteLength, gzipBytes: gzipBytesOf(buffer) };
			});
		return {
			bytes: matches.reduce((sum, file) => sum + file.bytes, 0),
			gzipBytes: matches.reduce((sum, file) => sum + file.gzipBytes, 0),
			files: matches
		};
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
			return { bytes: 0, gzipBytes: 0, files: [] };
		}
		throw error;
	}
}

export function measureHtmlBundle(buildDir) {
	const htmlFiles = collectHtmlFiles(buildDir);
	if (htmlFiles.length === 0) {
		throw new Error(`No HTML files under ${buildDir}`);
	}

	let bytes = 0;
	let gzipBytes = 0;
	let largest = { file: '', bytes: 0, gzipBytes: 0 };

	for (const file of htmlFiles) {
		const buffer = readFileSync(file);
		const gzip = gzipBytesOf(buffer);
		bytes += buffer.byteLength;
		gzipBytes += gzip;
		if (buffer.byteLength > largest.bytes) {
			largest = {
				file: relative(buildDir, file),
				bytes: buffer.byteLength,
				gzipBytes: gzip
			};
		}
	}

	return {
		htmlFiles: htmlFiles.length,
		bytes,
		gzipBytes,
		largest
	};
}

export function measureClientAssets(clientImmutableDir = svelteKitClientDir) {
	const js = measureNamedAssets(clientImmutableDir, (name) => /^bundle\..+\.js$/.test(name));
	const css = measureNamedAssets(join(clientImmutableDir, 'assets'), (name) =>
		/^style\..+\.css$/.test(name)
	);
	return { js, css };
}

function applyRenderer(renderer, files) {
	for (const file of files) {
		const source = readFileSync(file, 'utf8');
		writeFileSync(file, rewriteLayerchartRenderer(source, renderer));
	}
}

function restoreSources(originals) {
	for (const [file, source] of originals) {
		writeFileSync(file, source);
	}
}

function buildSite() {
	execFileSync('pnpm', ['build'], {
		cwd: repositoryRoot,
		env: { ...process.env, GH_TOKEN: '', GITHUB_TOKEN: '' },
		stdio: 'inherit'
	});
}

function formatBytes(n) {
	return `${n.toLocaleString('en')} B`;
}

function gzipDelta(value, baseline) {
	if (baseline == null) return '';
	const delta = value - baseline;
	if (delta === 0) return '';
	return `  (${delta > 0 ? '+' : ''}${delta.toLocaleString('en')} gzip vs svg)`;
}

function printRow(row, baselineGzip) {
	const js = row.client.js.files[0];
	console.log(
		[
			row.renderer.padEnd(8),
			formatBytes(row.html.bytes).padStart(14),
			formatBytes(row.html.gzipBytes).padStart(14),
			js
				? `${js.file} ${formatBytes(js.bytes)} / gzip ${formatBytes(js.gzipBytes)}`
				: '(no client bundle)',
			row.html.largest.file
		].join('  ') + gzipDelta(row.html.gzipBytes, baselineGzip)
	);
}

export function main() {
	const files = filesWithLayerchartRendererImports();
	if (files.length === 0) {
		throw new Error('No LayerChart renderer imports found');
	}

	const buildDir = join(repositoryRoot, 'build');
	const originals = new Map(files.map((file) => [file, readFileSync(file, 'utf8')]));
	const results = [];

	try {
		for (const renderer of RENDERERS) {
			console.log(`\n=== ${renderer} ===`);
			applyRenderer(renderer, files);
			buildSite();
			results.push({
				renderer,
				html: measureHtmlBundle(buildDir),
				client: measureClientAssets()
			});
		}
	} finally {
		restoreSources(originals);
	}

	results.sort((a, b) => a.html.gzipBytes - b.html.gzipBytes);
	const svg = results.find((row) => row.renderer === 'svg');

	console.log(
		'\nrenderer           html       gzip-9  client JS                                      page'
	);
	for (const row of results) {
		printRow(row, svg?.html.gzipBytes);
	}

	console.log(`\nsmallest gzip: ${results[0].renderer}`);
	return results;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
	main();
}
