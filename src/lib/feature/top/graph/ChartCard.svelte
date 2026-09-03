<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getChartImageBlob } from 'layerchart/utils/download';

	interface Props {
		title: string;
		subtitle: string;
		children: Snippet;
		class?: string;
	}

	let { title, subtitle, children, class: className = '' }: Props = $props();
	let chartRef = $state<HTMLElement>();

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
			<div>
				<strong>{title}</strong>
				<br />
				<span>{subtitle}</span>
			</div>
			<button type="button" onclick={copyChartImage} class="outline secondary">Copy</button>
		</figcaption>
		<div bind:this={chartRef}>
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

	figcaption button {
		margin-inline-start: auto;
	}
</style>
