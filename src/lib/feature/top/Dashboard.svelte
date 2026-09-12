<script lang="ts">
	import { onMount } from 'svelte';
	import DashboardCharts from '$lib/feature/top/graph/DashboardCharts.svelte';
	import GraphGroup from '$lib/feature/top/graph/GraphGroup.svelte';
	import RangeSwitcher from '$lib/feature/top/graph/RangeSwitcher.svelte';
	import {
		nextPremountRange,
		rememberMountedRange,
		yieldToMain
	} from '$lib/feature/top/graph/chart-range-mount';
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

		async function premountRemainingCharts() {
			while (!cancelled) {
				const next = nextPremountRange(mountedRanges);
				if (next === undefined) return;

				const pause = yieldToMain();
				if (pause) {
					await pause;
					if (cancelled) return;
				}

				const again = nextPremountRange(mountedRanges);
				if (again === undefined) return;
				mountedRanges = rememberMountedRange(mountedRanges, again);
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
				<DashboardCharts range={dashboard.ranges[days]} modelIndices={dashboard.modelIndices} />
			</div>
		{/each}
	</GraphGroup>
</section>
