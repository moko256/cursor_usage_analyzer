<script lang="ts">
	import { CsvParseError, parseCsvFile, type CsvPoint } from '$lib/csv-parser';
	import About from '$lib/feature/top/About.svelte';
	import DailyCostChart from '$lib/feature/top/graph/DailyCostChart.svelte';
	import DailyModelCostChart from '$lib/feature/top/graph/DailyModelCostChart.svelte';
	import GraphGroup from '$lib/feature/top/graph/GraphGroup.svelte';
	import ModelCostChart from '$lib/feature/top/graph/ModelCostChart.svelte';
	import ModelTokenChart from '$lib/feature/top/graph/ModelTokenChart.svelte';
	import Picker from '$lib/feature/top/Picker.svelte';
	import * as m from '$lib/paraglide/messages';

	type ViewState = 'idle' | 'loading' | 'success' | 'error';

	let points = $state<CsvPoint[]>([]);
	let status = $state<ViewState>('idle');
	let errorMessage = $state('');

	async function processFile(file: File | undefined) {
		if (!file || status === 'loading') return;

		if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
			status = 'error';
			errorMessage = m.invalid_file_type();
			return;
		}

		status = 'loading';
		errorMessage = '';
		points = [];

		try {
			points = await parseCsvFile(file);
			status = 'success';
		} catch (error) {
			status = 'error';
			errorMessage = getErrorMessage(error);
		}
	}

	function getErrorMessage(error: unknown) {
		if (!(error instanceof CsvParseError)) return m.csv_read_failed();

		switch (error.code) {
			case 'empty':
				return m.csv_empty();
			case 'missing_columns':
				return m.csv_missing_columns();
			case 'no_valid_data':
				return m.csv_no_valid_data();
			case 'background_parsing_unavailable':
				return m.background_parsing_unavailable();
			case 'background_parsing_failed':
				return m.background_parsing_failed();
			case 'unclosed_quotes':
				return m.csv_unclosed_quotes();
			default:
				return m.csv_parse_failed();
		}
	}
</script>

<svelte:head>
	<title>{m.page_title()}</title>
	<meta name="description" content={m.page_description()} />
</svelte:head>

<main class="container-fluid">
	<section class="container" aria-label={m.dashboard_aria_label()}>
		<Picker {status} {errorMessage} pointCount={points.length} onFileSelected={processFile} />

		{#if status === 'success'}
			<GraphGroup>
				<DailyCostChart {points} />
				<DailyModelCostChart {points} />
				<ModelTokenChart {points} />
				<ModelCostChart {points} />
			</GraphGroup>
		{/if}

		<About />
	</section>
</main>
