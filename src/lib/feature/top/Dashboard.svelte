<script lang="ts">
	import { onMount } from 'svelte';
	import DashboardCharts from '$lib/feature/top/graph/DashboardCharts.svelte';
	import GraphGroup from '$lib/feature/top/graph/GraphGroup.svelte';
	import RangeSwitcher from '$lib/feature/top/graph/RangeSwitcher.svelte';
	import { rememberMountedRange, nextPremountRange } from '$lib/feature/top/graph/chart-range-mount';
	import type { DashboardData, DayRange } from '$lib/feature/top/graph/chart-utils';
	import * as m from '$lib/paraglide/messages';
	import Usage from './Usage.svelte';

	interface Props {
		dashboard: DashboardData;
	}

	let { dashboard }: Props = $props();

	let rangeDays = $state<DayRange>('all');
	let mountedRanges = $state<DayRange[]>(['all']);
	let range = $derived(dashboard.ranges[rangeDays]);

	function selectRange(days: DayRange) {
		mountedRanges = rememberMountedRange(mountedRanges, days);
		rangeDays = days;
	}

	onMount(() => {
		let cancelled = false;

		function scheduleRangePremount() {
			const next = nextPremountRange(mountedRanges);
			if (next === undefined) return;

			const premount = () => {
				if (cancelled) return;
				mountedRanges = rememberMountedRange(mountedRanges, next);
				scheduleRangePremount();
			};

			if (typeof requestIdleCallback === 'function') {
				requestIdleCallback(premount, { timeout: 400 });
				return;
			}

			requestAnimationFrame(premount);
		}

		scheduleRangePremount();

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
			<div class={['graph-range', rangeDays === days && 'is-active']} aria-hidden={rangeDays !== days}>
				<DashboardCharts range={dashboard.ranges[days]} modelIndices={dashboard.modelIndices} />
			</div>
		{/each}
	</GraphGroup>
</section>
