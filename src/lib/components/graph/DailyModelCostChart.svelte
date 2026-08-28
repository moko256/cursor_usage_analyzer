<script lang="ts">
	import type { CsvPoint } from '$lib/csv-parser';
	import * as m from '$lib/paraglide/messages';
	import {
		chartBottom,
		chartHeight,
		chartPadding,
		chartRight,
		chartWidth,
		formatCurrency,
		formatDay,
		getStackedDailyBars,
		groupByDay,
		groupByModel,
		plotHeight
	} from './chart-utils';

	interface Props {
		points: CsvPoint[];
	}

	let { points }: Props = $props();
	let dayValues = $derived(groupByDay(points));
	let modelValues = $derived(groupByModel(points));
	let models = $derived(modelValues.map((value) => value.model));
	let maxDailyCost = $derived(Math.max(...dayValues.map((day) => day.cost), 0));
	let dailyCostScale = $derived(Math.max(maxDailyCost, 1));
	let stackedDailyBars = $derived(getStackedDailyBars(dayValues, models, dailyCostScale));
</script>

<wa-card class="chart-card">
	<figure>
		<figcaption>
			<strong>{m.models_per_day_heading()}</strong>
			<span>{m.daily_model_cost_subtitle()}</span>
		</figcaption>
		<div class="legend" aria-label={m.model_legend_aria()}>
			{#each models as model, index (model)}
				<span><i class={`legend-color color-${index % 5}`}></i>{model}</span>
			{/each}
		</div>
		<div class="chart-scroll">
			<svg
				class="chart-svg"
				viewBox={`0 0 ${chartWidth} ${chartHeight}`}
				role="img"
				aria-label={m.daily_model_cost_chart_aria({
					modelCount: models.length,
					dayCount: dayValues.length
				})}
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
								{m.daily_model_cost_value_title({
									date: formatDay(dayBars.day.day),
									model: segment.model,
									value: formatCurrency(segment.value)
								})}
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

	.day-label {
		fill: #99a19d;
		font-family: 'DM Sans', Avenir, sans-serif;
		font-size: 10px;
		text-anchor: middle;
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
