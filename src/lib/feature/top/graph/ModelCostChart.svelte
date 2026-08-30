<script lang="ts">
	import type { CsvPoint } from '$lib/csv-parser';
	import * as m from '$lib/paraglide/messages';
	import { BarChart, Tooltip } from 'layerchart';
	import { groupByModel, modelAxisPadding, truncateModelLabel } from './chart-utils';
	import ChartCard from './ChartCard.svelte';

	interface Props {
		points: CsvPoint[];
	}

	let { points }: Props = $props();
	const currency = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 2
	});
	let modelValues = $derived(groupByModel(points));
	let horizontalChartHeight = $derived(Math.max(190, modelValues.length * 36 + 55));
	let padding = $derived(modelAxisPadding(modelValues.map((value) => value.model)));
</script>

<ChartCard
	title={m.cost_per_model_heading()}
	subtitle={m.model_cost_subtitle()}
	class="horizontal-card"
>
	<div role="img" aria-label={m.model_cost_chart_aria()}>
		<BarChart
			data={modelValues}
			x="cost"
			y="model"
			orientation="horizontal"
			height={horizontalChartHeight}
			{padding}
			props={{ yAxis: { format: truncateModelLabel } }}
		>
			{#snippet tooltip()}
				<Tooltip.Root>
					{#snippet children({ data })}
						<Tooltip.Header>
							{m.model_cost_value_title({
								model: data.model,
								value: currency.format(data.cost)
							})}
						</Tooltip.Header>
					{/snippet}
				</Tooltip.Root>
			{/snippet}
		</BarChart>
	</div>
</ChartCard>
