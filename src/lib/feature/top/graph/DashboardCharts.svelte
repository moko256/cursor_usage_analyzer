<script lang="ts">
	import CalendarTokenChart from './CalendarTokenChart.svelte';
	import { DASHBOARD_CHART_COUNT } from './chart-range-mount';
	import DailyModelChart from './DailyModelChart.svelte';
	import HourlyTokenChart from './HourlyTokenChart.svelte';
	import ModelBreakdownChart from './ModelBreakdownChart.svelte';
	import type { ModelIndexTable, RangeChartData } from './chart-utils';

	interface Props {
		range: RangeChartData;
		modelIndices: ModelIndexTable;
		mountedCount?: number;
	}

	let { range, modelIndices, mountedCount = DASHBOARD_CHART_COUNT }: Props = $props();
</script>

<div class="graph-group-grid">
	{#if mountedCount >= 1}
		<DailyModelChart days={range.byDay} metric="tokens" {modelIndices} />
	{/if}
	{#if mountedCount >= 2}
		<DailyModelChart days={range.byDay} metric="cost" {modelIndices} />
	{/if}
	{#if mountedCount >= 3}
		<ModelBreakdownChart modelValues={range.byModelBreakdown} metric="tokens" {modelIndices} />
	{/if}
	{#if mountedCount >= 4}
		<ModelBreakdownChart modelValues={range.byModelBreakdown} metric="cost" {modelIndices} />
	{/if}
	{#if mountedCount >= 5}
		<CalendarTokenChart days={range.byDay} maxDailyTokens={range.maxDailyTokens} />
	{/if}
	{#if mountedCount >= 6}
		<HourlyTokenChart hours={range.byHour} />
	{/if}
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
	}
</style>
