<script lang="ts">
	import { onMount } from 'svelte';
	import DashboardCharts from '$lib/feature/top/graph/DashboardCharts.svelte';
	import GraphGroup from '$lib/feature/top/graph/GraphGroup.svelte';
	import RangeSwitcher from '$lib/feature/top/graph/RangeSwitcher.svelte';
	import {
		INITIAL_CHART_COUNTS,
		chartCountFor,
		ensureRangeVisible,
		incrementMountedChart,
		mountedRangesFromCounts,
		nextChartMountRange,
		yieldToMain,
		type ChartMountCounts
	} from '$lib/feature/top/graph/chart-range-mount';
	import type { DashboardData, DayRange } from '$lib/feature/top/graph/chart-utils';
	import * as m from '$lib/paraglide/messages';
	import Usage from './Usage.svelte';

	interface Props {
		dashboard: DashboardData;
	}

	let { dashboard }: Props = $props();

	let rangeDays = $state<DayRange>('all');
	let chartCounts = $state<ChartMountCounts>({ ...INITIAL_CHART_COUNTS });
	let range = $derived(dashboard.ranges[rangeDays]);
	let mountedRanges = $derived(mountedRangesFromCounts(chartCounts));

	function selectRange(days: DayRange) {
		chartCounts = ensureRangeVisible(chartCounts, days);
		rangeDays = days;
	}

	onMount(() => {
		let cancelled = false;

		async function premountRemainingCharts() {
			while (!cancelled) {
				const next = nextChartMountRange(chartCounts, rangeDays);
				if (next === undefined) return;

				const pause = yieldToMain();
				if (pause) {
					await pause;
					if (cancelled) return;
				}

				const again = nextChartMountRange(chartCounts, rangeDays);
				if (again === undefined) return;
				chartCounts = incrementMountedChart(chartCounts, again);
			}
		}

		void premountRemainingCharts();

		return () => {
			cancelled = true;
		};
	});
</script>

<section aria-label={m.dashboard_aria_label()}>
	<RangeSwitcher days={rangeDays} onselect={selectRange} />
	<Usage totalCost={range.totalCost} totalTokens={range.totalTokens} />
	<GraphGroup>
		{#each mountedRanges as days (days)}
			<div
				class={['graph-range', rangeDays === days && 'is-active']}
				aria-hidden={rangeDays !== days}
			>
				<DashboardCharts
					range={dashboard.ranges[days]}
					modelIndices={dashboard.modelIndices}
					mountedCount={chartCountFor(chartCounts, days)}
				/>
			</div>
		{/each}
	</GraphGroup>
</section>
