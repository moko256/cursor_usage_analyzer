<script lang="ts">
	import { parseCsvFile } from '$lib/csv-parser';
	import { csvParseErrorMessage } from '$lib/csv-parse-error-message';
	import CalendarTokenChart from '$lib/feature/top/graph/CalendarTokenChart.svelte';
	import DailyModelChart from '$lib/feature/top/graph/DailyModelChart.svelte';
	import GraphGroup from '$lib/feature/top/graph/GraphGroup.svelte';
	import HourlyTokenChart from '$lib/feature/top/graph/HourlyTokenChart.svelte';
	import ModelBreakdownChart from '$lib/feature/top/graph/ModelBreakdownChart.svelte';
	import RangeSwitcher from '$lib/feature/top/graph/RangeSwitcher.svelte';
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
	let dashboard = $derived(view.status === 'success' ? view.dashboard : null);
	let range = $derived(dashboard?.ranges[rangeDays]);
	let pickerView = $derived(toPickerView(view));

	async function processFile(file: File | undefined) {
		if (!file || view.status === 'loading') return;

		if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
			view = { status: 'error', message: m.invalid_file_type() };
			return;
		}

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

	<section class="container" aria-label={m.dashboard_aria_label()}>
		{#if dashboard && range}
			<RangeSwitcher bind:days={rangeDays} />
			<Usage totalCost={range.totalCost} totalTokens={range.totalTokens} />
			<GraphGroup>
				<DailyModelChart days={range.byDay} metric="tokens" />
				<DailyModelChart days={range.byDay} metric="cost" />
				<ModelBreakdownChart modelValues={range.byModelBreakdown} metric="tokens" />
				<ModelBreakdownChart modelValues={range.byModelBreakdown} metric="cost" />
				<CalendarTokenChart days={range.byDay} />
				<HourlyTokenChart hours={range.byHour} />
			</GraphGroup>
		{/if}
	</section>

	<PrivacyNotice />
</main>

<Footer />
