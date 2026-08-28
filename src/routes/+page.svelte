<script lang="ts">
	import { parseCsvFile, type CsvPoint } from '$lib/csv-parser';
	import About from '$lib/components/about/About.svelte';
	import DailyCostChart from '$lib/components/graph/DailyCostChart.svelte';
	import DailyModelCostChart from '$lib/components/graph/DailyModelCostChart.svelte';
	import ModelCostChart from '$lib/components/graph/ModelCostChart.svelte';
	import ModelTokenChart from '$lib/components/graph/ModelTokenChart.svelte';
	import Picker from '$lib/components/picker/Picker.svelte';

	import '@awesome.me/webawesome/dist/components/button/button.js';
	import '@awesome.me/webawesome/dist/components/callout/callout.js';
	import '@awesome.me/webawesome/dist/components/card/card.js';
	import '@awesome.me/webawesome/dist/components/icon/icon.js';
	import '@awesome.me/webawesome/dist/components/progress-bar/progress-bar.js';

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

<main class:loaded={status === 'success'} class="app-shell">
	<section class="dashboard-content" aria-label="CSV分析">
		<Picker {status} {errorMessage} pointCount={points.length} onFileSelected={processFile} />

		{#if status === 'success'}
			<section class="charts-grid" aria-label="コストチャート">
				<DailyCostChart {points} />
				<DailyModelCostChart {points} />
				<ModelTokenChart {points} />
				<ModelCostChart {points} />
			</section>
		{/if}
	</section>

	<About />
</main>

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(html),
	:global(body) {
		margin: 0;
		min-width: 0;
		background: #f5f4f1;
		color: #26363a;
		font-family:
			'DM Sans', 'Avenir Next', Avenir, 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif;
	}

	:global(wa-card) {
		--wa-card-border-color: #e2e0d9;
		--wa-card-border-radius: 12px;
		--wa-card-padding: 0;
		display: block;
		min-width: 0;
	}

	:global(wa-button) {
		--wa-button-border-radius: 8px;
	}

	:global(wa-progress-bar) {
		--track-color: #e9e7e0;
		--indicator-color: #d96e4d;
	}

	.app-shell {
		display: flex;
		width: min(1120px, 100%);
		min-height: 100dvh;
		flex-direction: column;
		gap: 16px;
		margin: 0 auto;
		padding: 16px clamp(12px, 3vw, 30px) 20px;
	}

	.dashboard-content {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: 16px;
		flex: 1 1 auto;
	}

	.app-shell:not(.loaded) .dashboard-content {
		flex: 1 1 auto;
	}

	.charts-grid {
		display: grid;
		min-width: 0;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}

	@media (max-width: 700px) {
		.charts-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
