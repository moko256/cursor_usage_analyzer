<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { Bar, Bars, BarChart, Tooltip } from 'layerchart/svg';
	import {
		buildModelBreakdownSeries,
		formatChartAxis,
		formatChartValue,
		modelAxisPadding,
		truncateModelLabel,
		type ChartMetric,
		type ModelBreakdownValue,
		type ModelIndexTable
	} from './chart-utils';
	import ChartCard from './ChartCard.svelte';
	import { chartTooltipRootProps } from './chart-tooltip';

	interface Props {
		modelValues: ModelBreakdownValue[];
		metric: ChartMetric;
		modelIndices: ModelIndexTable;
	}

	let { modelValues, metric, modelIndices }: Props = $props();
	let horizontalChartHeight = $derived(Math.max(190, modelValues.length * 36 + 55));
	let padding = $derived(modelAxisPadding(modelValues.map((value) => value.model)));
	let series = $derived(buildModelBreakdownSeries(modelValues, metric, modelIndices));
	let fillByKey = $derived(
		new Map<string, (row: ModelBreakdownValue) => string>(
			series.map((item) => [item.key, item.fill])
		)
	);
	let title = $derived(
		metric === 'tokens' ? m.tokens_per_model_heading() : m.cost_per_model_heading()
	);
	let subtitle = $derived(metric === 'tokens' ? m.model_token_subtitle() : m.model_cost_subtitle());
	let ariaLabel = $derived(
		metric === 'tokens' ? m.model_token_chart_aria() : m.model_cost_chart_aria()
	);
</script>

<ChartCard {title} {subtitle} {ariaLabel} class="horizontal-card">
	<BarChart
		data={modelValues}
		y="model"
		{series}
		seriesLayout="stack"
		orientation="horizontal"
		height={horizontalChartHeight}
		{padding}
		props={{
			xAxis: { format: (value) => formatChartAxis(value, metric) },
			yAxis: { format: truncateModelLabel }
		}}
	>
		{#snippet marks({ context })}
			{#each context.series.visibleSeries as s (s.key)}
				{@const fillFor = fillByKey.get(s.key)}
				<Bars
					seriesKey={s.key}
					radius={4}
					strokeWidth={1}
					rounded={(d) => (context.series.isStackTop(s.key, d) ? 'edge' : 'none')}
					opacity={(d) => (context.series.isHighlighted(context.cKey(d) ?? s.key, true) ? 1 : 0.1)}
				>
					{#each modelValues as d (d.model)}
						<Bar
							data={d}
							seriesKey={s.key}
							fill={fillFor?.(d)}
							radius={4}
							strokeWidth={1}
							rounded={context.series.isStackTop(s.key, d) ? 'edge' : 'none'}
							opacity={context.series.isHighlighted(context.cKey(d) ?? s.key, true) ? 1 : 0.1}
						/>
					{/each}
				</Bars>
			{/each}
		{/snippet}
		{#snippet tooltip()}
			<Tooltip.Root contained="window" props={{ root: chartTooltipRootProps }}>
				{#snippet children({ data })}
					<Tooltip.Header>{data.model}</Tooltip.Header>
					{#each series as item (item.key)}
						<Tooltip.Item
							label={item.label}
							value={formatChartValue(Math.abs(item.value(data)), metric)}
							color={item.fill(data)}
						/>
					{/each}
				{/snippet}
			</Tooltip.Root>
		{/snippet}
	</BarChart>
</ChartCard>
