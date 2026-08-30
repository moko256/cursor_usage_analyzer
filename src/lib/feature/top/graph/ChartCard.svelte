<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		subtitle: string;
		copyText: string;
		children: Snippet;
		class?: string;
	}

	let { title, subtitle, copyText, children, class: className = '' }: Props = $props();

	async function copyChartData() {
		await navigator.clipboard.writeText(copyText);
	}
</script>

<article class={['chart-card', className]}>
	<figure>
		<figcaption>
			<div>
				<strong>{title}</strong>
				<span>{subtitle}</span>
			</div>
			<button type="button" onclick={copyChartData}>copy</button>
		</figcaption>
		{@render children()}
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
