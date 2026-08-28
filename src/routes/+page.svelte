<script lang="ts">
	import { browser } from '$app/environment';
	import { parseCsvFile, type CsvPoint } from '$lib/csv-parser';
	import { SvelteMap } from 'svelte/reactivity';

	import '@awesome.me/webawesome/dist/components/button/button.js';
	import '@awesome.me/webawesome/dist/components/callout/callout.js';
	import '@awesome.me/webawesome/dist/components/card/card.js';
	import '@awesome.me/webawesome/dist/components/icon/icon.js';
	import '@awesome.me/webawesome/dist/components/progress-bar/progress-bar.js';

	type ViewState = 'idle' | 'loading' | 'success' | 'error';

	const chartWidth = 720;
	const chartHeight = 270;
	const chartPadding = { top: 20, right: 20, bottom: 48, left: 58 };
	const chartBottom = chartHeight - chartPadding.bottom;
	const chartRight = chartWidth - chartPadding.right;
	const plotHeight = chartBottom - chartPadding.top;
	const plotWidth = chartRight - chartPadding.left;

	let points = $state<CsvPoint[]>([]);
	let fileName = $state('');
	let status = $state<ViewState>('idle');
	let errorMessage = $state('');
	let isDragging = $state(false);
	let dragDepth = $state(0);

	let allPoints = $derived(points);
	let models = $derived.by(() =>
		Array.from(new Set(allPoints.map((point) => point.model || 'Unknown'))).sort((left, right) =>
			left.localeCompare(right)
		)
	);

	let dayValues = $derived.by(() => {
		const byDay = new SvelteMap<
			string,
			{ cost: number; tokens: number; models: SvelteMap<string, { cost: number; tokens: number }> }
		>();

		for (const point of allPoints) {
			const day = utcDay(point.date);
			const dayValue = byDay.get(day) ?? { cost: 0, tokens: 0, models: new SvelteMap() };
			const model = point.model || 'Unknown';
			const modelValue = dayValue.models.get(model) ?? { cost: 0, tokens: 0 };

			dayValue.cost += point.cost ?? 0;
			dayValue.tokens += point.tokens;
			modelValue.cost += point.cost ?? 0;
			modelValue.tokens += point.tokens;
			dayValue.models.set(model, modelValue);
			byDay.set(day, dayValue);
		}

		return Array.from(byDay.entries())
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([day, value]) => ({
				day,
				cost: value.cost,
				tokens: value.tokens,
				models: Array.from(value.models.entries())
					.sort(([left], [right]) => left.localeCompare(right))
					.map(([model, modelValue]) => ({ model, ...modelValue }))
			}));
	});

	let modelValues = $derived.by(() => {
		const byModel = new SvelteMap<string, { cost: number; tokens: number }>();

		for (const point of allPoints) {
			const model = point.model || 'Unknown';
			const value = byModel.get(model) ?? { cost: 0, tokens: 0 };
			value.cost += point.cost ?? 0;
			value.tokens += point.tokens;
			byModel.set(model, value);
		}

		return Array.from(byModel.entries())
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([model, value]) => ({ model, ...value }));
	});

	let maxDailyCost = $derived(Math.max(...dayValues.map((day) => day.cost), 0));
	let dailyCostScale = $derived(Math.max(maxDailyCost, 1));
	let maxDailyTokens = $derived(Math.max(...modelValues.map((model) => model.tokens), 0));
	let maxModelCost = $derived(Math.max(...modelValues.map((model) => model.cost), 0));

	let dailyCostBars = $derived.by(() => {
		const slotWidth = plotWidth / Math.max(dayValues.length, 1);
		const barWidth = Math.min(54, Math.max(14, slotWidth * 0.62));

		return dayValues.map((day, index) => {
			const valueHeight = (Math.max(day.cost, 0) / dailyCostScale) * plotHeight;
			return {
				day,
				x: chartPadding.left + slotWidth * index + (slotWidth - barWidth) / 2,
				y: chartBottom - valueHeight,
				width: barWidth,
				height: Math.max(valueHeight, 1)
			};
		});
	});

	let dailyCostPath = $derived(
		dailyCostBars.map((bar) => `${bar.x + bar.width / 2},${bar.y}`).join(' ')
	);

	let stackedDailyBars = $derived.by(() => {
		const slotWidth = plotWidth / Math.max(dayValues.length, 1);
		const barWidth = Math.min(54, Math.max(14, slotWidth * 0.62));

		return dayValues.map((day, index) => {
			const valuesByModel = new SvelteMap(day.models.map((value) => [value.model, value.cost]));
			let offset = 0;
			const segments = models.map((model) => {
				const value = Math.max(valuesByModel.get(model) ?? 0, 0);
				const segmentHeight = (value / dailyCostScale) * plotHeight;
				const segment = {
					model,
					value,
					x: chartPadding.left + slotWidth * index + (slotWidth - barWidth) / 2,
					y: chartBottom - offset - segmentHeight,
					width: barWidth,
					height: Math.max(segmentHeight, value === 0 ? 0 : 1)
				};
				offset += segmentHeight;
				return segment;
			});

			return { day, segments };
		});
	});

	let tokenBars = $derived.by(() => horizontalBars(modelValues, 'tokens', maxDailyTokens));
	let modelCostBars = $derived.by(() => horizontalBars(modelValues, 'cost', maxModelCost));
	let horizontalChartHeight = $derived(Math.max(190, modelValues.length * 36 + 55));

	const currency = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 2
	});
	const compactNumber = new Intl.NumberFormat('en-US', {
		notation: 'compact',
		maximumFractionDigits: 1
	});

	function utcDay(value: string) {
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? value.slice(0, 10) : date.toISOString().slice(0, 10);
	}

	function formatDay(value: string) {
		const date = new Date(`${value}T00:00:00Z`);
		return Number.isNaN(date.getTime())
			? value
			: new Intl.DateTimeFormat('en-US', {
					month: 'short',
					day: 'numeric',
					timeZone: 'UTC'
				}).format(date);
	}

	function formatCurrency(value: number) {
		return currency.format(value);
	}

	function formatNumber(value: number) {
		return compactNumber.format(value);
	}

	function horizontalBars(
		values: { model: string; cost: number; tokens: number }[],
		key: 'cost' | 'tokens',
		maximum: number
	) {
		const rowHeight = 36;
		const barStart = 130;
		const barEnd = chartWidth - 24;
		const scale = Math.max(maximum, 1);

		return values.map((modelValue, index) => {
			const value = Math.max(modelValue[key], 0);
			return {
				...modelValue,
				value,
				y: 28 + index * rowHeight,
				width: ((barEnd - barStart) * value) / scale,
				barStart,
				barEnd
			};
		});
	}

	async function processFile(file: File | undefined) {
		if (!file || status === 'loading') return;

		if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
			status = 'error';
			errorMessage = 'CSVファイルを選択してください。';
			return;
		}

		fileName = file.name;
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

	function openFilePicker() {
		if (browser) document.getElementById('csv-file-input')?.click();
	}

	function handlePickerKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openFilePicker();
		}
	}

	function handleFileInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		void processFile(input.files?.[0]);
		input.value = '';
	}

	function handleDragEnter(event: DragEvent) {
		event.preventDefault();
		dragDepth += 1;
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
		isDragging = true;
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
		isDragging = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		dragDepth = Math.max(dragDepth - 1, 0);
		if (dragDepth === 0) isDragging = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragDepth = 0;
		isDragging = false;
		void processFile(event.dataTransfer?.files[0]);
	}
</script>

<svelte:head>
	<title>CSVコスト分析</title>
	<meta name="description" content="CSVのコスト、モデル、トークンをコンパクトに可視化します。" />
</svelte:head>

<svelte:window
	ondragenter={handleDragEnter}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
/>

<main class:loaded={status === 'success'} class="app-shell">
	<header class="topbar">
		<h1><wa-icon name="chart-line" aria-hidden="true"></wa-icon> CSVコスト分析</h1>
		{#if status === 'success'}
			<span class="file-name"><wa-icon name="file-csv" aria-hidden="true"></wa-icon>{fileName}</span
			>
		{/if}
	</header>

	<section class="dashboard-content" aria-label="CSV分析">
		<wa-card class:compact={status === 'success'} class="picker-card">
			<div class="picker">
				<div class="picker-icon" aria-hidden="true"><wa-icon name="cloud-arrow-up"></wa-icon></div>
				<div>
					<h2>CSVを選択</h2>
					<p>CSVをドロップ、またはファイルを選択</p>
				</div>
				<wa-button
					variant="brand"
					size="m"
					type="button"
					role="button"
					tabindex="0"
					onclick={openFilePicker}
					onkeydown={handlePickerKeydown}
				>
					<wa-icon slot="start" name="folder-open"></wa-icon>
					選択
				</wa-button>
				<input
					id="csv-file-input"
					class="file-input"
					type="file"
					accept=".csv,text/csv"
					aria-label="CSVファイルを選択"
					onchange={handleFileInput}
				/>
				{#if status === 'loading'}
					<div class="picker-status" role="status">
						<span>解析中</span>
						<wa-progress-bar indeterminate label="CSVを解析中"></wa-progress-bar>
					</div>
				{:else if status === 'error'}
					<wa-callout variant="danger" appearance="outlined" class="picker-status">
						<wa-icon slot="icon" name="triangle-exclamation"></wa-icon>
						{errorMessage}
					</wa-callout>
				{:else if status === 'success'}
					<wa-callout variant="success" appearance="outlined" class="picker-status">
						<wa-icon slot="icon" name="circle-check"></wa-icon>
						{allPoints.length}件を読み込みました
					</wa-callout>
				{/if}
			</div>
		</wa-card>

		{#if status === 'success'}
			<section class="charts-grid" aria-label="コストチャート">
				<wa-card class="chart-card">
					<figure>
						<figcaption>
							<strong>値段/日</strong>
							<span>日別のコスト</span>
						</figcaption>
						<div class="chart-scroll">
							<svg
								class="chart-svg"
								viewBox={`0 0 ${chartWidth} ${chartHeight}`}
								role="img"
								aria-label={`日別コスト。${dayValues.length}日分。Freeと空欄は0として集計。`}
							>
								<line
									x1={chartPadding.left}
									x2={chartRight}
									y1={chartBottom}
									y2={chartBottom}
									class="axis"
								></line>
								{#each [0, 0.5, 1] as ratio (ratio)}
									<line
										x1={chartPadding.left}
										x2={chartRight}
										y1={chartBottom - ratio * plotHeight}
										y2={chartBottom - ratio * plotHeight}
										class="grid"
									></line>
									<text
										x={chartPadding.left - 10}
										y={chartBottom - ratio * plotHeight + 4}
										class="axis-label"
									>
										{formatCurrency(dailyCostScale * ratio)}
									</text>
								{/each}
								{#each dailyCostBars as bar (bar.day.day)}
									<rect
										x={bar.x}
										y={bar.y}
										width={bar.width}
										height={bar.height}
										rx="4"
										class="bar bar-primary"
									>
										<title>{formatDay(bar.day.day)}: {formatCurrency(bar.day.cost)}</title>
									</rect>
									<text x={bar.x + bar.width / 2} y={chartHeight - 17} class="day-label">
										{formatDay(bar.day.day)}
									</text>
								{/each}
								{#if dailyCostBars.length > 1}
									<polyline points={dailyCostPath} class="line"></polyline>
								{/if}
							</svg>
						</div>
					</figure>
				</wa-card>

				<wa-card class="chart-card">
					<figure>
						<figcaption>
							<strong>モデル/日</strong>
							<span>モデル別の日次コスト</span>
						</figcaption>
						<div class="legend" aria-label="モデル凡例">
							{#each models as model, index (model)}
								<span><i class={`legend-color color-${index % 5}`}></i>{model}</span>
							{/each}
						</div>
						<div class="chart-scroll">
							<svg
								class="chart-svg"
								viewBox={`0 0 ${chartWidth} ${chartHeight}`}
								role="img"
								aria-label={`モデル別の日次コスト。${models.length}モデル、${dayValues.length}日分。`}
							>
								<line
									x1={chartPadding.left}
									x2={chartRight}
									y1={chartBottom}
									y2={chartBottom}
									class="axis"
								></line>
								{#each [0, 0.5, 1] as ratio (ratio)}
									<line
										x1={chartPadding.left}
										x2={chartRight}
										y1={chartBottom - ratio * plotHeight}
										y2={chartBottom - ratio * plotHeight}
										class="grid"
									></line>
								{/each}
								{#each stackedDailyBars as dayBars (dayBars.day.day)}
									{#each dayBars.segments as segment (segment.model)}
										<rect
											x={segment.x}
											y={segment.y}
											width={segment.width}
											height={segment.height}
											class={`bar color-bar-${models.indexOf(segment.model) % 5}`}
										>
											<title>
												{formatDay(dayBars.day.day)} / {segment.model}: {formatCurrency(
													segment.value
												)}
											</title>
										</rect>
									{/each}
									<text
										x={dayBars.segments[0]?.x + (dayBars.segments[0]?.width ?? 0) / 2}
										y={chartHeight - 17}
										class="day-label"
									>
										{formatDay(dayBars.day.day)}
									</text>
								{/each}
							</svg>
						</div>
					</figure>
				</wa-card>

				<wa-card class="chart-card horizontal-card">
					<figure>
						<figcaption>
							<strong>Token/モデル</strong>
							<span>モデル別トークン数</span>
						</figcaption>
						<div class="chart-scroll">
							<svg
								class="chart-svg"
								viewBox={`0 0 ${chartWidth} ${horizontalChartHeight}`}
								role="img"
								aria-label="モデル別トークン数。バーは左から右へ増加します。"
							>
								{#each tokenBars as bar (bar.model)}
									<text x="8" y={bar.y + 14} class="model-label">{bar.model}</text>
									<line
										x1={bar.barStart}
										x2={bar.barEnd}
										y1={bar.y + 9}
										y2={bar.y + 9}
										class="track"
									></line>
									<rect
										x={bar.barStart}
										y={bar.y}
										width={Math.max(bar.width, 1)}
										height="18"
										rx="5"
										class="hbar hbar-token"
									>
										<title>{bar.model}: {formatNumber(bar.value)} tokens</title>
									</rect>
									<text x={bar.barStart + bar.width + 8} y={bar.y + 13} class="value-label">
										{formatNumber(bar.value)}
									</text>
								{/each}
							</svg>
						</div>
					</figure>
				</wa-card>

				<wa-card class="chart-card horizontal-card">
					<figure>
						<figcaption>
							<strong>値段/モデル</strong>
							<span>モデル別コスト</span>
						</figcaption>
						<div class="chart-scroll">
							<svg
								class="chart-svg"
								viewBox={`0 0 ${chartWidth} ${horizontalChartHeight}`}
								role="img"
								aria-label="モデル別コスト。バーは左から右へ増加します。"
							>
								{#each modelCostBars as bar (bar.model)}
									<text x="8" y={bar.y + 14} class="model-label">{bar.model}</text>
									<line
										x1={bar.barStart}
										x2={bar.barEnd}
										y1={bar.y + 9}
										y2={bar.y + 9}
										class="track"
									></line>
									<rect
										x={bar.barStart}
										y={bar.y}
										width={Math.max(bar.width, 1)}
										height="18"
										rx="5"
										class="hbar hbar-cost"
									>
										<title>{bar.model}: {formatCurrency(bar.value)}</title>
									</rect>
									<text x={bar.barStart + bar.width + 8} y={bar.y + 13} class="value-label">
										{formatCurrency(bar.value)}
									</text>
								{/each}
							</svg>
						</div>
					</figure>
				</wa-card>
			</section>
		{/if}
	</section>

	<section class="overview" aria-labelledby="overview-title">
		<h2 id="overview-title">概要</h2>
		<p>コスト・モデル・トークンの傾向を、日別とモデル別で確認できます。</p>
	</section>
</main>

{#if isDragging}
	<div
		class="drop-overlay"
		role="status"
		aria-live="assertive"
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
	>
		<div class="drop-message">
			<wa-icon name="cloud-arrow-up" aria-hidden="true"></wa-icon>
			<strong>ここにドロップ</strong>
			<span>CSVファイルを読み込みます</span>
		</div>
	</div>
{/if}

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

	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex: 0 0 auto;
	}

	.topbar h1 {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		color: #26363a;
		font-size: clamp(17px, 2.4vw, 21px);
		font-weight: 700;
		letter-spacing: -0.04em;
	}

	.topbar h1 :global(wa-icon) {
		color: #d96e4d;
		font-size: 19px;
	}

	.file-name {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 6px;
		overflow: hidden;
		color: #77817f;
		font-size: 11px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file-name :global(wa-icon) {
		flex: 0 0 auto;
		color: #d96e4d;
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

	.picker-card {
		min-width: 0;
		flex: 0 0 auto;
		background: #fffefa;
	}

	.app-shell:not(.loaded) .picker-card {
		flex: 1 1 auto;
	}

	.picker {
		display: flex;
		min-width: 0;
		flex-wrap: wrap;
		align-items: center;
		gap: 13px;
		padding: clamp(18px, 3vw, 28px);
	}

	.app-shell:not(.loaded) .picker {
		align-content: center;
		justify-content: center;
		min-height: 180px;
	}

	.picker-icon {
		display: grid;
		width: 40px;
		height: 40px;
		flex: 0 0 auto;
		place-items: center;
		border-radius: 10px;
		background: #f9dfd3;
		color: #c65f40;
		font-size: 19px;
	}

	.picker h2 {
		margin: 0 0 3px;
		font-size: 16px;
		letter-spacing: -0.03em;
	}

	.picker p {
		margin: 0;
		color: #88918e;
		font-size: 11px;
	}

	.picker :global(wa-button) {
		margin-left: auto;
	}

	.app-shell:not(.loaded) .picker :global(wa-button) {
		margin-left: 0;
	}

	.file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.picker-status {
		flex: 1 0 100%;
		margin-top: 2px;
	}

	.picker-status :global(wa-progress-bar) {
		display: block;
		margin-top: 7px;
	}

	.picker-status :global(p) {
		font-size: 11px;
	}

	.charts-grid {
		display: grid;
		min-width: 0;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}

	.chart-card {
		min-width: 0;
		overflow: hidden;
		background: #fffefa;
	}

	.chart-card figure {
		min-width: 0;
		margin: 0;
		padding: 16px 16px 12px;
	}

	.chart-card figcaption {
		display: flex;
		align-items: baseline;
		gap: 9px;
		margin-bottom: 10px;
	}

	.chart-card figcaption strong {
		font-size: 14px;
		letter-spacing: -0.025em;
	}

	.chart-card figcaption span {
		color: #9ba19d;
		font-size: 10px;
	}

	.chart-scroll {
		width: 100%;
		min-width: 0;
		overflow-x: auto;
		overflow-y: hidden;
	}

	.chart-svg {
		display: block;
		width: 100%;
		min-width: 390px;
		height: auto;
		overflow: visible;
	}

	.grid {
		stroke: #ecebe5;
		stroke-width: 1;
	}

	.axis {
		stroke: #cfd1ca;
		stroke-width: 1;
	}

	.axis-label,
	.day-label,
	.model-label,
	.value-label {
		fill: #99a19d;
		font-family: 'DM Sans', Avenir, sans-serif;
		font-size: 10px;
	}

	.day-label {
		text-anchor: middle;
	}

	.bar-primary {
		fill: #e98463;
	}

	.line {
		fill: none;
		stroke: #bd6044;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 5px 11px;
		margin: -2px 0 7px;
		color: #8e9792;
		font-size: 9px;
	}

	.legend span {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.legend-color,
	.color-bar-0 {
		background: #e98463;
	}

	.color-1,
	.color-bar-1 {
		background: #75aaa2;
	}

	.color-2,
	.color-bar-2 {
		background: #d9a45e;
	}

	.color-3,
	.color-bar-3 {
		background: #8b8ac1;
	}

	.color-4,
	.color-bar-4 {
		background: #7ca0c4;
	}

	.legend-color {
		display: inline-block;
		width: 7px;
		height: 7px;
		border-radius: 2px;
	}

	.color-bar-0 {
		fill: #e98463;
	}

	.color-bar-1 {
		fill: #75aaa2;
	}

	.color-bar-2 {
		fill: #d9a45e;
	}

	.color-bar-3 {
		fill: #8b8ac1;
	}

	.color-bar-4 {
		fill: #7ca0c4;
	}

	.track {
		stroke: #eeece6;
		stroke-linecap: round;
		stroke-width: 18;
	}

	.hbar {
		transition: opacity 150ms ease;
	}

	.hbar:hover {
		opacity: 0.75;
	}

	.hbar-token {
		fill: #75aaa2;
	}

	.hbar-cost {
		fill: #e98463;
	}

	.model-label {
		fill: #5d6969;
		font-size: 11px;
	}

	.value-label {
		fill: #77827e;
		font-size: 10px;
	}

	.overview {
		flex: 0 0 auto;
		padding: 15px 18px;
		border: 1px solid #e2e0d9;
		border-radius: 12px;
		background: rgba(255, 254, 250, 0.72);
	}

	.overview h2 {
		margin: 0 0 4px;
		font-size: 13px;
		letter-spacing: -0.02em;
	}

	.overview p {
		margin: 0;
		color: #8b9490;
		font-size: 11px;
		line-height: 1.5;
	}

	.drop-overlay {
		position: fixed;
		z-index: 10;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 18px;
		background: rgba(38, 54, 58, 0.87);
		backdrop-filter: blur(4px);
	}

	.drop-message {
		display: flex;
		align-items: center;
		flex-direction: column;
		width: min(500px, 100%);
		padding: 64px 24px;
		border: 2px dashed #f2ad91;
		border-radius: 16px;
		color: #fff8f2;
		text-align: center;
	}

	.drop-message :global(wa-icon) {
		margin-bottom: 14px;
		color: #f2ad91;
		font-size: 30px;
	}

	.drop-message strong {
		font-size: 21px;
		letter-spacing: -0.04em;
	}

	.drop-message span {
		margin-top: 6px;
		color: #c7d1ce;
		font-size: 11px;
	}

	@media (max-width: 700px) {
		.charts-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	@media (max-width: 460px) {
		.picker {
			align-items: flex-start;
		}

		.picker :global(wa-button) {
			margin-left: 53px;
		}

		.app-shell:not(.loaded) .picker :global(wa-button) {
			margin-left: 0;
		}

		.chart-card figure {
			padding-right: 10px;
			padding-left: 10px;
		}

		.chart-card figcaption {
			flex-direction: column;
			gap: 2px;
		}
	}
</style>
