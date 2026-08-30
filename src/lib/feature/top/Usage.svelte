<script lang="ts">
	import type { CsvPoint } from '$lib/csv-parser';
	import { sumCost } from '$lib/feature/top/graph/chart-utils';
	import * as m from '$lib/paraglide/messages';

	interface Props {
		points: CsvPoint[];
	}

	let { points }: Props = $props();
	let total = $derived(sumCost(points));
</script>

<section>
	<strong>{m.on_demand_usage({ value: `$${total.toFixed(1)}` })}</strong>
</section>
