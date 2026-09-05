<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	interface Props {
		totalCost: number;
		totalTokens: number;
	}

	let { totalCost, totalTokens }: Props = $props();
</script>

<section class="usage" aria-live="polite">
	<strong>{m.on_demand_usage({ value: `$${totalCost.toFixed(1)}` })}</strong>
	<strong>{m.total_tokens({ value: totalTokens.toLocaleString('en-US') })}</strong>
</section>

<style>
	.usage {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-block-start: var(--pico-spacing);
	}
</style>
