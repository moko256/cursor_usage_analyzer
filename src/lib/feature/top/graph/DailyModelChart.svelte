<script lang="ts">
	import type { CsvPoint } from '$lib/csv-parser';
	import * as m from '$lib/paraglide/messages';
	import { BarChart, Tooltip } from 'layerchart/svg';
	import { MediaQuery } from 'svelte/reactivity';
	import {
		buildDailyModelSeries,
		formatChartAxis,
		formatChartValue,
		formatDay,
		groupByDay,
		modelsFromDays,
		verticalChartHeight,
		verticalChartPadding,
		type ChartMetric
	} from './chart-utils';
	import ChartCard from './ChartCard.svelte';

	interface Props {
		points: CsvPoint[];
		metric: ChartMetric;
	}

	let { points, metric }: Props = $props();
	const isDark = new MediaQuery('(prefers-color-scheme: dark)');
	let dayValues = $derived(
		groupByDay(points).map((day) => ({
			...day,
			label: formatDay(day.day)
		}))
	);
	let models = $derived(modelsFromDays(dayValues));
	let series = $derived(buildDailyModelSeries(models, metric, isDark.current));
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
