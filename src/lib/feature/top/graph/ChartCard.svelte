<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getChartImageBlob } from 'layerchart/utils/download';

	interface Props {
		title?: string;
		subtitle?: string;
		ariaLabel: string;
		children: Snippet;
		class?: string;
	}

	let { title, subtitle, ariaLabel, children, class: className = '' }: Props = $props();
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
			<div class="caption-text">
				{#if title}<strong>{title}</strong>{/if}
				{#if subtitle}<span>{subtitle}</span>{/if}
			</div>
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

	figcaption {
		display: flex;
		align-items: baseline;
	}

	.caption-text {
		display: flex;
		flex-direction: column;
	}

	figcaption button {
		margin-inline-start: auto;
	}
</style>
