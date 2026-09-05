<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { BarChart, Tooltip } from 'layerchart/svg';
	import type { ComponentProps } from 'svelte';
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

	interface Props {
		modelValues: ModelBreakdownValue[];
		metric: ChartMetric;
		modelIndices: ModelIndexTable;
	}

	let { modelValues, metric, modelIndices }: Props = $props();
	let horizontalChartHeight = $derived(Math.max(190, modelValues.length * 36 + 55));
	let padding = $derived(modelAxisPadding(modelValues.map((value) => value.model)));
	let series = $derived(buildModelBreakdownSeries(modelValues, metric, modelIndices));
	/** LayerChart types `fill` as a CSS string; Bars still resolve a per-row accessor at runtime. */
	let chartSeries = $derived(
		series.map((item) => ({
			key: item.key,
			label: item.label,
			color: item.color,
			value: item.value,
			props: { fill: item.fill }
		})) as unknown as NonNullable<ComponentProps<typeof BarChart>['series']>
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
		series={chartSeries}
		seriesLayout="stack"
		orientation="horizontal"
		height={horizontalChartHeight}
		{padding}
		props={{
			xAxis: { format: (value) => formatChartAxis(value, metric) },
			yAxis: { format: truncateModelLabel }
		}}
	>
		{#snippet tooltip()}
			<Tooltip.Root>
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
