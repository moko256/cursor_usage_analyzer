<script lang="ts">
	import type { CsvPoint } from '$lib/csv-parser';
	import * as m from '$lib/paraglide/messages';
	import { BarChart, Tooltip } from 'layerchart';
	import { groupByModel } from './chart-utils';

	interface Props {
		points: CsvPoint[];
	}

	let { points }: Props = $props();
	const compactNumber = new Intl.NumberFormat('en-US', {
		notation: 'compact',
		maximumFractionDigits: 1
	});
	let modelValues = $derived(groupByModel(points));
	let horizontalChartHeight = $derived(Math.max(190, modelValues.length * 36 + 55));
</script>

<article class="chart-card horizontal-card">
	<figure>
		<figcaption>
			<strong>{m.tokens_per_model_heading()}</strong>
			<span>{m.model_token_subtitle()}</span>
		</figcaption>
		<div role="img" aria-label={m.model_token_chart_aria()}>
			<BarChart
				data={modelValues}
				x="tokens"
				y="model"
				orientation="horizontal"
				height={horizontalChartHeight}
			>
				{#snippet tooltip()}
					<Tooltip.Root>
						{#snippet children({ data })}
							<Tooltip.Header>
								{m.model_token_value_title({
									model: data.model,
									value: compactNumber.format(data.tokens)
								})}
							</Tooltip.Header>
						{/snippet}
					</Tooltip.Root>
				{/snippet}
			</BarChart>
		</div>
	</figure>
</article>
