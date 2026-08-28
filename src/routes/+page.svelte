<script lang="ts">
	import { parseCsvFile, type CsvPoint } from '$lib/csv-parser';
	import About from '$lib/components/about/About.svelte';
	import DailyCostChart from '$lib/components/graph/DailyCostChart.svelte';
	import DailyModelCostChart from '$lib/components/graph/DailyModelCostChart.svelte';
	import GraphGroup from '$lib/components/graph/GraphGroup.svelte';
	import ModelCostChart from '$lib/components/graph/ModelCostChart.svelte';
	import ModelTokenChart from '$lib/components/graph/ModelTokenChart.svelte';
	import Picker from '$lib/components/picker/Picker.svelte';

	type ViewState = 'idle' | 'loading' | 'success' | 'error';

	let points = $state<CsvPoint[]>([]);
	let status = $state<ViewState>('idle');
	let errorMessage = $state('');

	async function processFile(file: File | undefined) {
		if (!file || status === 'loading') return;

		if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
			status = 'error';
			errorMessage = 'CSVファイルを選択してください。';
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
			errorMessage =
				error instanceof Error
					? error.message
					: 'CSVファイルを読み込めませんでした。もう一度お試しください。';
		}
	}
</script>

<svelte:head>
	<title>CSVコスト分析</title>
	<meta name="description" content="CSVのコスト、モデル、トークンをコンパクトに可視化します。" />
</svelte:head>

<main class="container-fluid">
	<section class="container" aria-label="CSV分析">
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
