<script lang="ts">
	import type { CsvPoint } from '$lib/csv-parser';
	import { sumCost, sumTokens } from '$lib/feature/top/graph/chart-utils';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		points: CsvPoint[];
	}

	let { points }: Props = $props();
	let total = $derived(sumCost(points));
	let totalTokens = $derived(sumTokens(points));
</script>

<section>
	<strong>{m.on_demand_usage({ value: `$${total.toFixed(1)}` })}</strong>
	<strong class="total-tokens">{m.total_tokens({ value: totalTokens.toLocaleString('en-US') })}</strong>
</section>

<style>
	.total-tokens {
		margin-inline-start: 1rem;
	}
</style>
