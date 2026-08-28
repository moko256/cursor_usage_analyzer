<script lang="ts">
	import type { CsvPoint } from '$lib/csv-parser';
	import { chartWidth, formatNumber, getHorizontalBars, groupByModel } from './chart-utils';

	interface Props {
		points: CsvPoint[];
	}

	let { points }: Props = $props();
	let modelValues = $derived(groupByModel(points));
	let maxDailyTokens = $derived(Math.max(...modelValues.map((model) => model.tokens), 0));
	let tokenBars = $derived(getHorizontalBars(modelValues, 'tokens', maxDailyTokens));
	let horizontalChartHeight = $derived(Math.max(190, modelValues.length * 36 + 55));
</script>

<article class="chart-card horizontal-card">
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
					<line x1={bar.barStart} x2={bar.barEnd} y1={bar.y + 9} y2={bar.y + 9} class="track"
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
</article>

<style>
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

	.model-label,
	.value-label {
		fill: #99a19d;
		font-family: 'DM Sans', Avenir, sans-serif;
		font-size: 10px;
	}

	.model-label {
		fill: #5d6969;
		font-size: 11px;
	}

	.value-label {
		fill: #77827e;
		font-size: 10px;
	}

	@media (max-width: 460px) {
		.chart-card figure {
			padding-right: 10px;
			padding-left: 10px;
		}

		.chart-card figcaption {
			align-items: flex-start;
			flex-direction: column;
			gap: 2px;
		}
	}
</style>
