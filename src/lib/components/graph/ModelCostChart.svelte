<script lang="ts">
	import type { CsvPoint } from '$lib/csv-parser';
	import * as m from '$lib/paraglide/messages';
	import { BarChart, Tooltip } from 'layerchart';
	import { groupByModel } from './chart-utils';

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
</script>

<article class="chart-card horizontal-card">
	<figure>
		<figcaption>
			<strong>{m.cost_per_model_heading()}</strong>
			<span>{m.model_cost_subtitle()}</span>
		</figcaption>
		<div role="img" aria-label={m.model_cost_chart_aria()}>
			<BarChart
				data={modelValues}
				x="cost"
				y="model"
				orientation="horizontal"
				height={horizontalChartHeight}
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
	</figure>
</article>
