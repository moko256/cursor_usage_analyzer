<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { BarChart, Tooltip } from 'layerchart/svg';
	import {
		buildDailyModelSeries,
		formatChartAxis,
		formatChartValue,
		formatDay,
		modelsFromDays,
		verticalChartHeight,
		verticalChartPadding,
		type ChartMetric,
		type DailyValue,
		type ModelIndexTable
	} from './chart-utils';
	import ChartCard from './ChartCard.svelte';

	interface Props {
		days: DailyValue[];
		metric: ChartMetric;
		modelIndices: ModelIndexTable;
	}

	let { days, metric, modelIndices }: Props = $props();
	let dayValues = $derived(
		days.map((day) => ({
			...day,
			label: formatDay(day.day)
		}))
	);
	let models = $derived(modelsFromDays(dayValues));
	let series = $derived(buildDailyModelSeries(models, metric, modelIndices));
	let title = $derived(
		metric === 'tokens' ? m.tokens_per_day_heading() : m.models_per_day_heading()
	);
	let subtitle = $derived(
		metric === 'tokens' ? m.daily_model_token_subtitle() : m.daily_model_cost_subtitle()
	);
	let ariaLabel = $derived(
		metric === 'tokens'
			? m.daily_model_token_chart_aria({
					modelCount: models.length,
					dayCount: dayValues.length
				})
			: m.daily_model_cost_chart_aria({
					modelCount: models.length,
					dayCount: dayValues.length
				})
	);
	let tooltipTitle = $derived(
		metric === 'tokens' ? m.daily_model_token_value_title : m.daily_model_cost_value_title
	);
</script>

<ChartCard {title} {subtitle}>
	<div role="img" aria-label={ariaLabel}>
		<BarChart
			data={dayValues}
			x="label"
			{series}
			seriesLayout="stack"
			padding={verticalChartPadding}
			height={verticalChartHeight}
			props={{ yAxis: { format: (value) => formatChartAxis(value, metric) } }}
		>
			{#snippet tooltip()}
				<Tooltip.Root>
					{#snippet children({ data })}
						{#each data.models as model (model.model)}
							<Tooltip.Header>
								{tooltipTitle({
									date: formatDay(data.day),
									model: model.model,
									value: formatChartValue(model[metric], metric)
								})}
							</Tooltip.Header>
						{/each}
					{/snippet}
				</Tooltip.Root>
			{/snippet}
		</BarChart>
	</div>
</ChartCard>
