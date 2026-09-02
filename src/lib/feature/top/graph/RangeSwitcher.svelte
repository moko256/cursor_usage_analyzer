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

<div role="group" aria-label={m.chart_range_aria()}>
	{#each DAY_RANGES as range (range)}
		<button
			type="button"
			class={days === range ? undefined : 'outline secondary'}
			aria-current={days === range ? true : undefined}
			onclick={() => (days = range)}
		>
			{rangeLabel(range)}
		</button>
	{/each}
</div>

<style>
	[role='group'] {
		width: fit-content;
	}

	[role='group'] :global(button) {
		flex: 0 0 auto;
		width: max-content;
		white-space: nowrap;
	}
</style>
