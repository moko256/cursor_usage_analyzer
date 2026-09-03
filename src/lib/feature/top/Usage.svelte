<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	interface Props {
		totalCost: number;
		totalTokens: number;
	}

	let { totalCost, totalTokens }: Props = $props();
</script>

<section aria-live="polite">
	<strong>{m.on_demand_usage({ value: `$${totalCost.toFixed(1)}` })}</strong>
	<strong class="total-tokens"
		>{m.total_tokens({ value: totalTokens.toLocaleString('en-US') })}</strong
	>
</section>

<style>
	section {
		margin-block-start: var(--pico-spacing);
	}

	.total-tokens {
		margin-inline-start: 1rem;
	}
</style>
