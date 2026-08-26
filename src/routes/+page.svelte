<script lang="ts">
	import { browser } from '$app/environment';
	import { parseCsvFile, type CsvPoint } from '$lib/csv-parser';

	import '@awesome.me/webawesome/dist/components/button/button.js';
	import '@awesome.me/webawesome/dist/components/card/card.js';
	import '@awesome.me/webawesome/dist/components/icon/icon.js';
	import '@awesome.me/webawesome/dist/components/progress-bar/progress-bar.js';

	type ViewState = 'idle' | 'loading' | 'success' | 'error';

	const chartWidth = 900;
	const chartHeight = 380;
	const chartPadding = { top: 28, right: 28, bottom: 58, left: 72 };
	const chartBottom = chartHeight - chartPadding.bottom;
	const chartRight = chartWidth - chartPadding.right;

	let inputFileName = $state('');
	let points = $state<CsvPoint[]>([]);
	let status = $state<ViewState>('idle');
	let errorMessage = $state('');
	let isDragging = $state(false);
	let dragDepth = $state(0);

	let allPoints = $derived(points);
	let numericPoints = $derived(points.filter((point) => point.cost !== null));
	let totalCost = $derived(numericPoints.reduce((total, point) => total + (point.cost ?? 0), 0));
	let averageCost = $derived(numericPoints.length > 0 ? totalCost / numericPoints.length : 0);
	let firstDate = $derived(allPoints[0]?.date ?? '—');
	let lastDate = $derived(allPoints[allPoints.length - 1]?.date ?? '—');

	let minimumCost = $derived(
		numericPoints.length > 0 ? Math.min(...numericPoints.map((point) => point.cost ?? 0)) : 0
	);
	let maximumCost = $derived(
		numericPoints.length > 0 ? Math.max(...numericPoints.map((point) => point.cost ?? 0)) : 0
	);
	let chartMaximum = $derived(Math.max(0, maximumCost));
	let chartRange = $derived(Math.max(chartMaximum, 1));

	let chartPoints = $derived.by(() => {
		const denominator = Math.max(allPoints.length - 1, 1);

		return allPoints.map((point, index) => {
			const cost = Math.max(0, point.cost ?? 0);
			const x =
				allPoints.length === 1
					? chartWidth / 2
					: chartPadding.left + (index / denominator) * (chartRight - chartPadding.left);
			const y = chartBottom - (cost / chartRange) * (chartBottom - chartPadding.top);

			return {
				point,
				x,
				y,
				barWidth: Math.min(
					42,
					Math.max(12, (chartRight - chartPadding.left) / allPoints.length - 10)
				)
			};
		});
	});

	let chartPath = $derived(chartPoints.map(({ x, y }) => `${x},${y}`).join(' '));
	let yTicks = $derived(
		[0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
			value: chartRange * ratio,
			y: chartBottom - ratio * (chartBottom - chartPadding.top)
		}))
	);

	let statusMessage = $derived.by(() => {
		if (status === 'loading') return 'CSVを読み込んでいます';
		if (status === 'error') return errorMessage;
		if (status === 'success') return `${inputFileName}の読み込みが完了しました`;
		return 'CSVファイルを選択するか、ページにドロップしてください';
	});

	const currency = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 2
	});

	function formatCurrency(value: number) {
		return currency.format(value);
	}

	function formatDate(value: string) {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(date);
	}

	async function processFile(file: File | undefined) {
		if (!file || status === 'loading') return;

		if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
			status = 'error';
			errorMessage = 'CSVファイルを選択してください。';
			return;
		}

		inputFileName = file.name;
		status = 'loading';
		errorMessage = '';
		points = [];

		try {
			const parsedPoints = await parseCsvFile(file);
			points = parsedPoints;
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
		if (browser) {
			document.getElementById('csv-file-input')?.click();
		}
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
		dragDepth = Math.max(0, dragDepth - 1);
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
	<title>CSV Cost Atlas</title>
	<meta name="description" content="Upload a CSV file to explore cost trends over time." />
</svelte:head>

<svelte:window
	ondragenter={handleDragEnter}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
/>

<main class="page-shell">
	<div class="ambient ambient-one"></div>
	<div class="ambient ambient-two"></div>

	<header class="page-header">
		<div class="brand-lockup">
			<div class="brand-mark" aria-hidden="true">
				<wa-icon name="chart-line"></wa-icon>
			</div>
			<div>
				<p class="eyebrow">CSV COST ATLAS</p>
				<h1>コストの流れを、ひと目で。</h1>
			</div>
		</div>
		<p class="header-note">アップロードしたデータはブラウザ内だけで処理されます。</p>
	</header>

	<section class="hero-grid" aria-labelledby="upload-title">
		<wa-card class="upload-card">
			<div class="card-content">
				<div class="section-kicker">
					<span class="kicker-line"></span>
					<span>DATA IMPORT</span>
				</div>
				<h2 id="upload-title">CSVを読み込む</h2>
				<p class="lede">日付とコストのデータをアップロードして、支出の変化を確認しましょう。</p>

				<div class="drop-zone" class:drop-zone-active={isDragging} aria-describedby="drop-help">
					<div class="upload-icon" aria-hidden="true">
						<wa-icon name="cloud-arrow-up"></wa-icon>
					</div>
					<p class="drop-title">ここにCSVファイルをドロップ</p>
					<p class="drop-subtitle">または</p>
					<wa-button
						variant="brand"
						size="medium"
						type="button"
						role="button"
						tabindex="0"
						onclick={openFilePicker}
						onkeydown={handlePickerKeydown}
					>
						<wa-icon slot="start" name="folder-open"></wa-icon>
						ファイルを選択
					</wa-button>
					<p id="drop-help" class="drop-help">CSV形式、最大 25 MB</p>
					<input
						id="csv-file-input"
						class="file-input"
						type="file"
						accept=".csv,text/csv"
						aria-label="CSVファイルを選択"
						onchange={handleFileInput}
					/>
				</div>

				{#if status === 'loading'}
					<div class="loading-state" role="status">
						<div class="state-heading">
							<wa-icon name="spinner" label="読み込み中"></wa-icon>
							<span>データを解析中です</span>
						</div>
						<wa-progress-bar indeterminate label="CSVを解析中"></wa-progress-bar>
					</div>
				{:else if status === 'error'}
					<wa-callout variant="danger" appearance="outlined" class="status-callout">
						<wa-icon slot="icon" name="triangle-exclamation"></wa-icon>
						<strong>読み込みに失敗しました</strong>
						<p>{errorMessage}</p>
					</wa-callout>
				{:else if status === 'success'}
					<wa-callout variant="success" appearance="outlined" class="status-callout">
						<wa-icon slot="icon" name="circle-check"></wa-icon>
						<strong>{inputFileName}</strong>
						<p>{points.length}件のレコードを読み込みました。</p>
					</wa-callout>
				{/if}
			</div>
		</wa-card>

		<div class="hero-aside">
			<div class="aside-orbit orbit-one"></div>
			<div class="aside-orbit orbit-two"></div>
			<div class="aside-content">
				<p class="eyebrow">MAKE SENSE OF YOUR SPEND</p>
				<p class="aside-copy">数字を、次の一手につながる<br /><em>ストーリー</em>に変える。</p>
				<div class="aside-detail">
					<wa-icon name="sparkles"></wa-icon>
					<span>シンプルな可視化で、変化を見逃さない</span>
				</div>
			</div>
			<div class="aside-stamp" aria-hidden="true">
				<span>01</span>
				<span>INSIGHT</span>
			</div>
		</div>
	</section>

	<section class="dashboard" aria-labelledby="dashboard-title">
		<div class="dashboard-heading">
			<div>
				<p class="section-kicker"><span class="kicker-line"></span><span>OVERVIEW</span></p>
				<h2 id="dashboard-title">コストダッシュボード</h2>
			</div>
			<div class="file-badge" class:file-badge-visible={inputFileName !== ''}>
				<wa-icon name="file-csv" aria-hidden="true"></wa-icon>
				<span>{inputFileName || 'CSV未選択'}</span>
			</div>
		</div>

		{#if status === 'idle'}
			<wa-card class="empty-card">
				<div class="empty-state">
					<div class="empty-graphic" aria-hidden="true">
						<wa-icon name="chart-line"></wa-icon>
					</div>
					<h3>チャートを表示する準備ができています</h3>
					<p>CSVファイルをアップロードすると、ここにコストの推移が表示されます。</p>
				</div>
			</wa-card>
		{:else if status === 'loading'}
			<wa-card class="empty-card">
				<div class="empty-state loading-empty">
					<wa-progress-bar indeterminate label="ダッシュボードを準備中"></wa-progress-bar>
					<p>データを整えています…</p>
				</div>
			</wa-card>
		{:else if status === 'error'}
			<wa-card class="empty-card">
				<div class="empty-state">
					<div class="empty-graphic empty-graphic-error" aria-hidden="true">
						<wa-icon name="file-circle-xmark"></wa-icon>
					</div>
					<h3>データを表示できません</h3>
					<p>ファイルを確認して、もう一度アップロードしてください。</p>
				</div>
			</wa-card>
		{:else if allPoints.length === 0}
			<wa-card class="empty-card">
				<div class="empty-state">
					<div class="empty-graphic empty-graphic-warm" aria-hidden="true">
						<wa-icon name="magnifying-glass"></wa-icon>
					</div>
					<h3>表示できるデータがありません</h3>
					<p>有効なDateとCostの行があるCSVをアップロードすると、チャートが表示されます。</p>
				</div>
			</wa-card>
		{:else}
			<div class="stats-grid">
				<div class="stat-card stat-card-featured">
					<div class="stat-icon" aria-hidden="true"><wa-icon name="wallet"></wa-icon></div>
					<div>
						<p class="stat-label">合計コスト</p>
						<p class="stat-value">{formatCurrency(totalCost)}</p>
					</div>
					<span class="stat-spark" aria-hidden="true">↗</span>
				</div>
				<div class="stat-card">
					<div class="stat-icon stat-icon-muted" aria-hidden="true">
						<wa-icon name="calculator"></wa-icon>
					</div>
					<div>
						<p class="stat-label">平均コスト</p>
						<p class="stat-value">{formatCurrency(averageCost)}</p>
					</div>
				</div>
				<div class="stat-card">
					<div class="stat-icon stat-icon-muted" aria-hidden="true">
						<wa-icon name="database"></wa-icon>
					</div>
					<div>
						<p class="stat-label">データポイント</p>
						<p class="stat-value">{allPoints.length}<small>件</small></p>
					</div>
				</div>
				<div class="stat-card">
					<div class="stat-icon stat-icon-muted" aria-hidden="true">
						<wa-icon name="calendar-days"></wa-icon>
					</div>
					<div>
						<p class="stat-label">対象期間</p>
						<p class="stat-value stat-value-date">
							{formatDate(firstDate)} <span>→</span>
							{formatDate(lastDate)}
						</p>
					</div>
				</div>
			</div>

			<wa-card class="chart-card">
				<div slot="header" class="chart-header">
					<div>
						<h3>コストの推移</h3>
						<p>日付ごとのコスト変化を表示しています</p>
					</div>
					<div class="chart-legend">
						<span class="legend-dot"></span>
						<span>コスト</span>
					</div>
				</div>
				<div class="chart-wrap">
					<svg
						viewBox={`0 0 ${chartWidth} ${chartHeight}`}
						role="img"
						aria-labelledby="chart-title chart-description"
					>
						<title id="chart-title">日付ごとのコスト推移</title>
						<desc id="chart-description">
							{formatDate(firstDate)}から{formatDate(
								lastDate
							)}までの全{allPoints.length}件のコストを棒と線で表示しています。
							Freeと空欄のCostは0として表示しています。
						</desc>
						<defs>
							<linearGradient id="chart-area-fill" x1="0" x2="0" y1="0" y2="1">
								<stop offset="0%" stop-color="#e87852" stop-opacity="0.2"></stop>
								<stop offset="100%" stop-color="#e87852" stop-opacity="0"></stop>
							</linearGradient>
							<linearGradient id="bar-fill" x1="0" x2="0" y1="0" y2="1">
								<stop offset="0%" stop-color="#f39a73"></stop>
								<stop offset="100%" stop-color="#e87852"></stop>
							</linearGradient>
						</defs>
						{#each yTicks as tick (tick.value)}
							<line x1={chartPadding.left} x2={chartRight} y1={tick.y} y2={tick.y} class="grid-line"
							></line>
							<text x={chartPadding.left - 14} y={tick.y + 4} text-anchor="end" class="axis-label">
								{formatCurrency(tick.value)}
							</text>
						{/each}
						<line
							x1={chartPadding.left}
							x2={chartRight}
							y1={chartBottom}
							y2={chartBottom}
							class="axis-line"
						></line>
						{#if chartPoints.length > 1}
							<polygon
								points={`${chartPadding.left},${chartBottom} ${chartPath} ${chartRight},${chartBottom}`}
								class="chart-area"
							></polygon>
						{/if}
						{#each chartPoints as chartPoint (chartPoint.point)}
							<rect
								x={chartPoint.x - chartPoint.barWidth / 2}
								y={chartPoint.y}
								width={chartPoint.barWidth}
								height={Math.max(2, chartBottom - chartPoint.y)}
								rx="5"
								class="chart-bar"
							>
								<title
									>{formatDate(chartPoint.point.date)}: {formatCurrency(
										chartPoint.point.cost ?? 0
									)}</title
								>
							</rect>
						{/each}
						{#if chartPoints.length > 1}
							<polyline points={chartPath} class="chart-line"></polyline>
						{/if}
						{#each chartPoints as chartPoint (chartPoint.point)}
							<circle cx={chartPoint.x} cy={chartPoint.y} r="5" class="chart-point">
								<title
									>{formatDate(chartPoint.point.date)}: {formatCurrency(
										chartPoint.point.cost ?? 0
									)}</title
								>
							</circle>
						{/each}
						<text x={chartPadding.left} y={chartHeight - 18} class="axis-label axis-date">
							{formatDate(firstDate)}
						</text>
						<text
							x={chartRight}
							y={chartHeight - 18}
							text-anchor="end"
							class="axis-label axis-date"
						>
							{formatDate(lastDate)}
						</text>
					</svg>
				</div>
				<div slot="footer" class="chart-footer">
					<span>全{allPoints.length}件（Free・空欄は0として表示）</span>
					<span>数値範囲: {formatCurrency(minimumCost)} — {formatCurrency(maximumCost)}</span>
					<span>単位: USD</span>
				</div>
			</wa-card>
		{/if}
	</section>

	<p class="sr-only" aria-live="polite">{statusMessage}</p>
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
		<div class="overlay-inner">
			<div class="overlay-icon" aria-hidden="true"><wa-icon name="cloud-arrow-up"></wa-icon></div>
			<strong>ここにドロップしてアップロード</strong>
			<span>CSVファイルを受け付けます</span>
		</div>
	</div>
{/if}

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		background: #f5f3ee;
		color: #24343b;
		font-family:
			'DM Sans', 'Avenir Next', Avenir, 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif;
	}

	:global(wa-card) {
		--wa-card-border-color: #e5e1d8;
		--wa-card-border-radius: 18px;
		--wa-card-padding: 0;
		display: block;
	}

	:global(wa-button) {
		--wa-button-border-radius: 10px;
	}

	:global(wa-progress-bar) {
		--track-color: #ece7dd;
		--indicator-color: #e87852;
	}

	.page-shell {
		position: relative;
		min-height: 100vh;
		overflow: hidden;
		padding: 42px clamp(20px, 5vw, 80px) 72px;
	}

	.ambient {
		position: absolute;
		z-index: -1;
		border-radius: 999px;
		filter: blur(1px);
		pointer-events: none;
	}

	.ambient-one {
		top: -220px;
		right: -130px;
		width: 580px;
		height: 580px;
		background: #e7ece8;
		opacity: 0.62;
	}

	.ambient-two {
		bottom: 5%;
		left: -390px;
		width: 680px;
		height: 680px;
		background: #eee7dd;
		opacity: 0.7;
	}

	.page-header,
	.hero-grid,
	.dashboard {
		position: relative;
		z-index: 1;
		width: min(1180px, 100%);
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 28px;
		margin-bottom: 58px;
	}

	.brand-lockup {
		display: flex;
		align-items: center;
		gap: 15px;
	}

	.brand-mark {
		display: grid;
		width: 44px;
		height: 44px;
		place-items: center;
		border-radius: 13px;
		background: #24343b;
		color: #ffd7c6;
		font-size: 21px;
		transform: rotate(-5deg);
	}

	.brand-mark :global(wa-icon) {
		transform: rotate(5deg);
	}

	.eyebrow {
		margin: 0 0 7px;
		color: #a26c52;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.2em;
	}

	h1,
	h2,
	h3,
	p {
		margin-top: 0;
	}

	h1,
	h2,
	h3 {
		letter-spacing: -0.04em;
	}

	h1 {
		margin-bottom: 0;
		font-size: clamp(20px, 2.3vw, 27px);
		font-weight: 650;
	}

	.header-note {
		max-width: 250px;
		margin: 0;
		color: #7b8585;
		font-size: 12px;
		line-height: 1.6;
		text-align: right;
	}

	.hero-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
		gap: clamp(26px, 5vw, 76px);
		align-items: stretch;
		margin-bottom: 84px;
	}

	.upload-card {
		min-height: 480px;
		background: #fffdfa;
	}

	.card-content {
		padding: clamp(28px, 4vw, 47px);
	}

	.section-kicker {
		display: flex;
		align-items: center;
		gap: 9px;
		margin-bottom: 18px;
		color: #a26c52;
		font-size: 10px;
		font-weight: 750;
		letter-spacing: 0.18em;
	}

	.kicker-line {
		display: inline-block;
		width: 24px;
		height: 2px;
		background: #e87852;
	}

	h2 {
		margin-bottom: 12px;
		font-size: clamp(28px, 4vw, 42px);
		line-height: 1.1;
	}

	.lede {
		max-width: 410px;
		margin-bottom: 30px;
		color: #728083;
		font-size: 14px;
		line-height: 1.75;
	}

	.drop-zone {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 222px;
		padding: 24px;
		border: 1.5px dashed #cdc7bb;
		border-radius: 14px;
		background: #faf8f3;
		text-align: center;
		transition:
			border-color 160ms ease,
			background 160ms ease,
			transform 160ms ease;
	}

	.drop-zone-active {
		border-color: #e87852;
		background: #fff2eb;
		transform: scale(1.01);
	}

	.upload-icon,
	.empty-graphic {
		display: grid;
		width: 48px;
		height: 48px;
		place-items: center;
		border-radius: 13px;
		background: #f7d8c8;
		color: #ba6347;
		font-size: 22px;
	}

	.drop-title {
		margin: 13px 0 4px;
		color: #3b484d;
		font-size: 15px;
		font-weight: 650;
	}

	.drop-subtitle {
		margin-bottom: 11px;
		color: #9a9b94;
		font-size: 12px;
	}

	.drop-help {
		margin: 13px 0 0;
		color: #969993;
		font-size: 11px;
	}

	.file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
		clip-path: inset(50%);
	}

	.status-callout,
	.loading-state {
		margin-top: 19px;
	}

	.status-callout p {
		margin: 5px 0 0;
		font-size: 12px;
	}

	.state-heading {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 9px;
		color: #697777;
		font-size: 12px;
	}

	.state-heading :global(wa-icon) {
		color: #e87852;
	}

	.hero-aside {
		position: relative;
		display: flex;
		align-items: flex-end;
		min-height: 480px;
		overflow: hidden;
		border-radius: 18px;
		background: #2c4044;
		color: #f8f1e9;
	}

	.hero-aside::before {
		position: absolute;
		top: 30%;
		left: 25%;
		width: 58%;
		height: 58%;
		border: 1px solid rgba(255, 226, 206, 0.18);
		border-radius: 50%;
		content: '';
		transform: rotate(-25deg) scaleX(1.45);
	}

	.aside-content {
		position: relative;
		z-index: 1;
		padding: 42px;
	}

	.aside-content .eyebrow {
		color: #d79b82;
	}

	.aside-copy {
		margin: 0 0 30px;
		font-size: clamp(27px, 3.2vw, 39px);
		font-weight: 400;
		line-height: 1.22;
		letter-spacing: -0.055em;
	}

	.aside-copy em {
		color: #f2a27f;
		font-style: normal;
	}

	.aside-detail {
		display: flex;
		align-items: center;
		gap: 9px;
		color: #b4c0be;
		font-size: 11px;
		line-height: 1.5;
	}

	.aside-detail :global(wa-icon) {
		color: #f2a27f;
		font-size: 15px;
	}

	.aside-stamp {
		position: absolute;
		top: 35px;
		right: 35px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		color: #78908c;
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-align: right;
	}

	.aside-stamp span:first-child {
		color: #f2a27f;
		font-family: Georgia, serif;
		font-size: 24px;
		font-weight: 400;
		letter-spacing: 0;
	}

	.aside-orbit {
		position: absolute;
		border: 1px solid rgba(229, 178, 152, 0.15);
		border-radius: 50%;
		transform: rotate(31deg) scaleY(0.5);
	}

	.orbit-one {
		right: -25%;
		bottom: 8%;
		width: 90%;
		height: 60%;
	}

	.orbit-two {
		right: -38%;
		bottom: -5%;
		width: 105%;
		height: 64%;
	}

	.dashboard-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 23px;
	}

	.dashboard-heading .section-kicker {
		margin-bottom: 14px;
	}

	.dashboard-heading h2 {
		margin-bottom: 0;
		font-size: clamp(26px, 3vw, 34px);
	}

	.file-badge {
		display: flex;
		align-items: center;
		gap: 8px;
		max-width: 280px;
		padding: 9px 13px;
		border: 1px solid #e4dfd5;
		border-radius: 9px;
		color: #8d928e;
		font-size: 11px;
		opacity: 0.7;
	}

	.file-badge-visible {
		color: #a26c52;
		opacity: 1;
	}

	.file-badge span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.empty-card {
		background: rgba(255, 253, 250, 0.6);
	}

	.empty-state {
		display: flex;
		min-height: 330px;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		padding: 35px;
		text-align: center;
	}

	.empty-state h3 {
		margin: 19px 0 8px;
		font-size: 19px;
	}

	.empty-state p {
		max-width: 360px;
		margin-bottom: 0;
		color: #8a918f;
		font-size: 13px;
		line-height: 1.65;
	}

	.empty-graphic-error {
		background: #f5ddd8;
		color: #b45d57;
	}

	.empty-graphic-warm {
		background: #f5e5c9;
		color: #af8052;
	}

	.loading-empty {
		gap: 16px;
	}

	.loading-empty :global(wa-progress-bar) {
		width: min(250px, 100%);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 13px;
		margin-bottom: 14px;
	}

	.stat-card {
		display: flex;
		position: relative;
		align-items: center;
		gap: 13px;
		min-width: 0;
		padding: 20px 17px;
		border: 1px solid #e5e1d8;
		border-radius: 14px;
		background: rgba(255, 253, 250, 0.72);
	}

	.stat-card-featured {
		border-color: transparent;
		background: #e87852;
		color: #fff8f2;
	}

	.stat-icon {
		display: grid;
		width: 34px;
		height: 34px;
		flex: 0 0 auto;
		place-items: center;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.2);
		font-size: 16px;
	}

	.stat-icon-muted {
		background: #eeeae2;
		color: #9d7562;
	}

	.stat-label {
		margin: 0 0 5px;
		color: #9b9890;
		font-size: 10px;
		font-weight: 650;
		letter-spacing: 0.05em;
	}

	.stat-card-featured .stat-label {
		color: rgba(255, 248, 242, 0.74);
	}

	.stat-value {
		margin: 0;
		font-size: clamp(17px, 2vw, 23px);
		font-weight: 650;
		letter-spacing: -0.04em;
		white-space: nowrap;
	}

	.stat-value small {
		margin-left: 3px;
		font-size: 11px;
		font-weight: 500;
	}

	.stat-value-date {
		font-size: 12px;
		letter-spacing: -0.02em;
	}

	.stat-value-date span {
		padding: 0 2px;
		color: #b4aaa0;
	}

	.stat-spark {
		position: absolute;
		top: 14px;
		right: 15px;
		color: rgba(255, 255, 255, 0.6);
		font-size: 18px;
	}

	.chart-card {
		overflow: hidden;
		background: #fffdfa;
	}

	.chart-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20px;
		padding: 25px 28px 9px;
	}

	.chart-header h3 {
		margin: 0 0 5px;
		font-size: 19px;
	}

	.chart-header p {
		margin: 0;
		color: #9a9d97;
		font-size: 11px;
	}

	.chart-legend {
		display: flex;
		align-items: center;
		gap: 7px;
		color: #929790;
		font-size: 11px;
	}

	.legend-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #e87852;
		box-shadow: 0 0 0 3px #fbe2d8;
	}

	.chart-wrap {
		padding: 8px 22px 0;
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
		overflow: visible;
	}

	.grid-line {
		stroke: #eeeae2;
		stroke-width: 1;
	}

	.axis-line {
		stroke: #d9d4c9;
		stroke-width: 1;
	}

	.axis-label {
		fill: #a2a39d;
		font-family: 'DM Sans', Avenir, sans-serif;
		font-size: 11px;
	}

	.axis-date {
		fill: #8b918b;
		font-size: 10px;
	}

	.chart-area {
		fill: url(#chart-area-fill);
	}

	.chart-bar {
		fill: url(#bar-fill);
		opacity: 0.16;
		transition: opacity 160ms ease;
	}

	.chart-bar:hover {
		opacity: 0.5;
	}

	.chart-line {
		fill: none;
		stroke: #e87852;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 3;
	}

	.chart-point {
		fill: #fffdfa;
		stroke: #e87852;
		stroke-width: 3;
	}

	.chart-footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 8px 16px;
		padding: 3px 28px 20px;
		color: #a1a39c;
		font-size: 10px;
		letter-spacing: 0.02em;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.drop-overlay {
		position: fixed;
		z-index: 20;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 30px;
		background: rgba(36, 52, 59, 0.88);
		backdrop-filter: blur(6px);
	}

	.overlay-inner {
		display: flex;
		align-items: center;
		flex-direction: column;
		justify-content: center;
		width: min(580px, 100%);
		min-height: 310px;
		border: 2px dashed #f2a27f;
		border-radius: 22px;
		color: #fff8f2;
		text-align: center;
	}

	.overlay-icon {
		display: grid;
		width: 66px;
		height: 66px;
		margin-bottom: 20px;
		place-items: center;
		border-radius: 19px;
		background: #f2a27f;
		color: #2c4044;
		font-size: 28px;
	}

	.overlay-inner strong {
		font-size: 23px;
		font-weight: 550;
		letter-spacing: -0.04em;
	}

	.overlay-inner span {
		margin-top: 9px;
		color: #c7d1ce;
		font-size: 12px;
	}

	@media (max-width: 880px) {
		.page-shell {
			padding-top: 28px;
		}

		.page-header {
			margin-bottom: 38px;
		}

		.hero-grid {
			grid-template-columns: 1fr;
			margin-bottom: 60px;
		}

		.hero-aside {
			min-height: 300px;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 520px) {
		.page-header {
			align-items: flex-start;
			flex-direction: column;
			gap: 16px;
		}

		.header-note {
			max-width: 100%;
			text-align: left;
		}

		.card-content {
			padding: 25px 18px;
		}

		.hero-aside {
			min-height: 330px;
		}

		.aside-content {
			padding: 30px 25px;
		}

		.dashboard-heading {
			align-items: flex-start;
			flex-direction: column;
		}

		.file-badge {
			max-width: 100%;
		}

		.stats-grid {
			gap: 8px;
		}

		.stat-card {
			align-items: flex-start;
			flex-direction: column;
			gap: 9px;
			padding: 14px 12px;
		}

		.stat-value {
			font-size: 16px;
		}

		.stat-value-date {
			font-size: 10px;
		}

		.chart-header {
			padding: 21px 16px 7px;
		}

		.chart-wrap {
			padding: 7px 8px 0;
		}

		.chart-footer {
			padding: 3px 16px 17px;
		}
	}
</style>
