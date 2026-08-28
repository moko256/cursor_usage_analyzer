<script lang="ts">
	import type { CsvPoint } from '$lib/csv-parser';
	import {
		chartBottom,
		chartHeight,
		chartPadding,
		chartRight,
		chartWidth,
		formatCurrency,
		formatDay,
		getDailyCostBars,
		groupByDay,
		plotHeight
	} from './chart-utils';

	interface Props {
		points: CsvPoint[];
	}

	let { points }: Props = $props();
	let dayValues = $derived(groupByDay(points));
	let maxDailyCost = $derived(Math.max(...dayValues.map((day) => day.cost), 0));
	let dailyCostScale = $derived(Math.max(maxDailyCost, 1));
	let dailyCostBars = $derived(getDailyCostBars(dayValues, dailyCostScale));
	let dailyCostPath = $derived(
		dailyCostBars.map((bar) => `${bar.x + bar.width / 2},${bar.y}`).join(' ')
	);
</script>

<article class="chart-card">
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
				<line x1={chartPadding.left} x2={chartRight} y1={chartBottom} y2={chartBottom} class="axis"
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

	.grid {
		stroke: #ecebe5;
		stroke-width: 1;
	}

	.axis {
		stroke: #cfd1ca;
		stroke-width: 1;
	}

	.axis-label,
	.day-label {
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
