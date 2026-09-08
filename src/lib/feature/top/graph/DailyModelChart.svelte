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
		chartTooltipRootProps,
		type ChartMetric,
		type DailyValue,
		type ModelIndexTable
	} from './chart-utils';
	import ChartCard from './ChartCard.svelte';
	import ChartLegend from './ChartLegend.svelte';

	interface Props {
		days: DailyValue[];
		metric: ChartMetric;
		modelIndices: ModelIndexTable;
	}

	let { days, metric, modelIndices }: Props = $props();
	let models = $derived(modelsFromDays(days));
	let series = $derived(buildDailyModelSeries(models, metric, modelIndices));
	let colorByModel = $derived(new Map(series.map((item) => [item.key, item.color])));
	let legendItems = $derived(
		series.map((item) => ({ key: item.key, label: item.label, color: item.color }))
	);
	let title = $derived(
		metric === 'tokens' ? m.tokens_per_day_heading() : m.models_per_day_heading()
	);
	let ariaLabel = $derived(
		metric === 'tokens'
			? m.daily_model_token_chart_aria({
					modelCount: models.length,
					dayCount: days.length
				})
			: m.daily_model_cost_chart_aria({
					modelCount: models.length,
					dayCount: days.length
				})
	);
</script>

<ChartCard {title} {ariaLabel}>
	<BarChart
		data={days}
		x="day"
		{series}
		seriesLayout="stack"
		padding={verticalChartPadding}
		height={verticalChartHeight}
		props={{
			xAxis: { format: formatDay },
			yAxis: { format: (value) => formatChartAxis(value, metric) }
		}}
	>
		{#snippet tooltip()}
			<Tooltip.Root {...chartTooltipRootProps}>
				{#snippet children({ data })}
					<Tooltip.Header>{formatDay(data.day)}</Tooltip.Header>
					<Tooltip.List>
						{#each data.models as model (model.model)}
							<Tooltip.Item
								label={model.model}
								value={formatChartValue(model[metric], metric)}
								color={colorByModel.get(model.model)}
							/>
						{/each}
						<Tooltip.Separator />
						<Tooltip.Item
							label={m.chart_tooltip_total()}
							value={formatChartValue(data[metric], metric)}
						/>
					</Tooltip.List>
				{/snippet}
			</Tooltip.Root>
		{/snippet}
	</BarChart>
	<ChartLegend items={legendItems} />
</ChartCard>
