<script lang="ts">
	import type { CsvPoint } from '$lib/csv-parser';
	import * as m from '$lib/paraglide/messages';
	import { BarChart, Tooltip } from 'layerchart';
	import { formatDay, groupByDay, groupByModel, type DailyValue } from './chart-utils';
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
	let dayValues = $derived(
		groupByDay(points).map((day) => ({
			...day,
			label: formatDay(day.day)
		}))
	);
	let models = $derived(groupByModel(points).map((value) => value.model));
	let series = $derived(
		models.map((model) => ({
			key: model,
			value: (day: DailyValue) => day.models.find((value) => value.model === model)?.cost ?? 0
		}))
	);
</script>

<ChartCard title={m.models_per_day_heading()} subtitle={m.daily_model_cost_subtitle()}>
	<div class="legend" aria-label={m.model_legend_aria()}>
		{#each models as model, index (model)}
			<span><i class={`legend-color color-${index % 5}`}></i>{model}</span>
		{/each}
	</div>
	<div
		role="img"
		aria-label={m.daily_model_cost_chart_aria({
			modelCount: models.length,
			dayCount: dayValues.length
		})}
	>
		<BarChart data={dayValues} x="label" {series} seriesLayout="stack" height={270}>
			{#snippet tooltip()}
				<Tooltip.Root>
					{#snippet children({ data })}
						{#each data.models as model (model.model)}
							<Tooltip.Header>
								{m.daily_model_cost_value_title({
									date: formatDay(data.day),
									model: model.model,
									value: currency.format(model.cost)
								})}
							</Tooltip.Header>
						{/each}
					{/snippet}
				</Tooltip.Root>
			{/snippet}
		</BarChart>
	</div>
</ChartCard>
