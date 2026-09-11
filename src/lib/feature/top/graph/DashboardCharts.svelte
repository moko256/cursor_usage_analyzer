<script lang="ts">
	import CalendarTokenChart from './CalendarTokenChart.svelte';
	import DailyModelChart from './DailyModelChart.svelte';
	import HourlyTokenChart from './HourlyTokenChart.svelte';
	import ModelBreakdownChart from './ModelBreakdownChart.svelte';
	import type { ModelIndexTable, RangeChartData } from './chart-utils';

	interface Props {
		range: RangeChartData;
		modelIndices: ModelIndexTable;
	}

	let { range, modelIndices }: Props = $props();
</script>

<div class="graph-group-grid">
	<DailyModelChart days={range.byDay} metric="tokens" {modelIndices} />
	<DailyModelChart days={range.byDay} metric="cost" {modelIndices} />
	<ModelBreakdownChart modelValues={range.byModelBreakdown} metric="tokens" {modelIndices} />
	<ModelBreakdownChart modelValues={range.byModelBreakdown} metric="cost" {modelIndices} />
	<CalendarTokenChart days={range.byDay} maxDailyTokens={range.maxDailyTokens} />
	<HourlyTokenChart hours={range.byHour} />
</div>

<style>
	.graph-group-grid {
		display: grid;
		min-width: 0;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--pico-spacing);

		@media (max-width: 700px) {
			grid-template-columns: minmax(0, 1fr);
		}

		@media print {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
