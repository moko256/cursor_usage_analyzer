<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getChartImageBlob } from 'layerchart/utils/download';

	interface Props {
		title: string;
		ariaLabel: string;
		children: Snippet;
		class?: string;
	}

	let { title, ariaLabel, children, class: className = '' }: Props = $props();
	let chartRef: HTMLElement | undefined;

	function attachChart(node: HTMLElement) {
		chartRef = node;
		return () => {
			if (chartRef === node) chartRef = undefined;
		};
	}

	async function copyChartImage() {
		if (!chartRef) return;

		const background = getComputedStyle(chartRef)
			.getPropertyValue('--pico-background-color')
			.trim();
		const blob = await getChartImageBlob(chartRef, { format: 'png', background });
		await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
	}
</script>

<article class={['chart-card', className]}>
	<figure>
		<figcaption>
			<strong>{title}</strong>
			<button type="button" onclick={copyChartImage} class="outline secondary">Copy</button>
		</figcaption>
		<div {@attach attachChart} role="img" aria-label={ariaLabel}>
			{@render children()}
		</div>
	</figure>
</article>

<style>
	/*
	 * LayerChart wraps every piece of chart text in a nested `<svg>` that has to paint outside its own
	 * viewport, and asks for `overflow: visible` from `@layer base`. Pico's normalize hides overflow on
	 * every nested `<svg>` without using a layer, and unlayered rules beat layered ones, so axis tick
	 * labels are clipped away entirely. The plot area is still clipped by the outer `<svg>`.
	 */
	.chart-card :global(svg.lc-text-svg) {
		overflow: visible;
	}

	.chart-card {
		@media print {
			display: inline-block;
			width: 100%;
			break-inside: avoid;
			page-break-inside: avoid;

			&.print-break-before {
				break-before: page;
				page-break-before: always;
			}
		}
	}

	figcaption {
		display: flex;
		align-items: baseline;
	}

	figcaption button {
		margin-inline-start: auto;
	}
</style>
