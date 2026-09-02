<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { DAY_RANGES, type DayRange } from './chart-utils';

	interface Props {
		days: DayRange;
	}

	let { days = $bindable() }: Props = $props();

	function rangeLabel(range: DayRange) {
		switch (range) {
			case 1:
				return m.range_1_day();
			case 7:
				return m.range_7_days();
			case 30:
				return m.range_30_days();
		}
	}
</script>

<div role="group" style="width: fit-content" aria-label={m.chart_range_aria()}>
	{#each DAY_RANGES as range (range)}
		{#if days === range}
			<button type="button" aria-current="true" onclick={() => (days = range)}>
				{rangeLabel(range)}
			</button>
		{:else}
			<button type="button" class="outline secondary" onclick={() => (days = range)}>
				{rangeLabel(range)}
			</button>
		{/if}
	{/each}
</div>
