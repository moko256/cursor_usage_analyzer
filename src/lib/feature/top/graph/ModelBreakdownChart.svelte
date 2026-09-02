<script lang="ts">
	import type { CsvPoint } from '$lib/csv-parser';
	import * as m from '$lib/paraglide/messages';
	import { BarChart, Tooltip } from 'layerchart/svg';
	import { MediaQuery } from 'svelte/reactivity';
	import {
		buildModelBreakdownSeries,
		formatChartAxis,
		formatChartValue,
		groupByModelBreakdown,
		modelAxisPadding,
		truncateModelLabel,
		type ChartMetric
	} from './chart-utils';
	import ChartCard from './ChartCard.svelte';

	interface Props {
		points: CsvPoint[];
		metric: ChartMetric;
	}

	let { points, metric }: Props = $props();
	const isDark = new MediaQuery('(prefers-color-scheme: dark)');
	let modelValues = $derived(groupByModelBreakdown(points));
	let horizontalChartHeight = $derived(Math.max(190, modelValues.length * 36 + 55));
	let padding = $derived(modelAxisPadding(modelValues.map((value) => value.model)));
	let series = $derived(buildModelBreakdownSeries(modelValues, metric, isDark.current));
	let title = $derived(
		metric === 'tokens' ? m.tokens_per_model_heading() : m.cost_per_model_heading()
	);
	let subtitle = $derived(metric === 'tokens' ? m.model_token_subtitle() : m.model_cost_subtitle());
	let ariaLabel = $derived(
		metric === 'tokens' ? m.model_token_chart_aria() : m.model_cost_chart_aria()
	);
</script>

<ChartCard {title} {subtitle} class="horizontal-card">
	<div role="img" aria-label={ariaLabel}>
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
			{#snippet tooltip()}
				<Tooltip.Root>
					{#snippet children({ data })}
						<Tooltip.Header>{data.model}</Tooltip.Header>
						{#each series as item (item.key)}
							<Tooltip.Item
								label={item.label}
								value={formatChartValue(Math.abs(item.value(data)), metric)}
								color={item.color}
							/>
						{/each}
					{/snippet}
				</Tooltip.Root>
			{/snippet}
		</BarChart>
	</div>
</ChartCard>
