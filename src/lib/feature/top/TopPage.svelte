<script lang="ts">
	import { parseCsvFile } from '$lib/csv-parser';
	import { csvParseErrorMessage } from '$lib/csv-parse-error-message';
	import DashboardCharts from '$lib/feature/top/graph/DashboardCharts.svelte';
	import GraphGroup from '$lib/feature/top/graph/GraphGroup.svelte';
	import RangeSwitcher from '$lib/feature/top/graph/RangeSwitcher.svelte';
	import { rememberMountedRange } from '$lib/feature/top/graph/chart-range-mount';
	import type { DayRange } from '$lib/feature/top/graph/chart-utils';
	import Header from '$lib/feature/top/Header.svelte';
	import * as m from '$lib/paraglide/messages';
	import { toPickerView, type ParseView } from './parse-view';
	import Footer from './Footer.svelte';
	import Picker from './Picker.svelte';
	import Usage from './Usage.svelte';
	import PrivacyNotice from './PrivacyNotice.svelte';
	import NoScript from '$lib/components/NoScript.svelte';

	let view = $state.raw<ParseView>({ status: 'idle' });
	let rangeDays = $state<DayRange>('all');
	let mountedRanges = $state<DayRange[]>(['all']);
	let dashboard = $derived(view.status === 'success' ? view.dashboard : null);
	let range = $derived(dashboard?.ranges[rangeDays]);
	let pickerView = $derived(toPickerView(view));

	function selectRange(days: DayRange) {
		rangeDays = days;
		mountedRanges = rememberMountedRange(mountedRanges, days);
	}

	function resetMountedRanges() {
		rangeDays = 'all';
		mountedRanges = ['all'];
	}

	async function processFile(file: File | undefined) {
		if (!file || view.status === 'loading') return;

		if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
			view = { status: 'error', message: m.invalid_file_type() };
			return;
		}

		resetMountedRanges();
		view = { status: 'loading' };

		try {
			view = { status: 'success', dashboard: await parseCsvFile(file, m.unknown_model()) };
		} catch (error) {
			view = { status: 'error', message: csvParseErrorMessage(error) };
		}
	}
</script>

<svelte:head>
	<title>{m.page_title()}</title>
	<meta name="description" content={m.page_description()} />
</svelte:head>

<Header />

<main class="container">
	<NoScript />

	<Picker view={pickerView} onFileSelected={processFile} />

	{#if dashboard && range}
		<section aria-label={m.dashboard_aria_label()}>
			<RangeSwitcher days={rangeDays} onselect={selectRange} />
			<Usage totalCost={range.totalCost} totalTokens={range.totalTokens} />
			<GraphGroup>
				{#each mountedRanges as days (days)}
					<div class="graph-range" hidden={rangeDays !== days} inert={rangeDays !== days}>
						<DashboardCharts range={dashboard.ranges[days]} modelIndices={dashboard.modelIndices} />
					</div>
				{/each}
			</GraphGroup>
		</section>
	{/if}

	<PrivacyNotice />
</main>

<Footer />
