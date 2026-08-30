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
	const compactNumber = new Intl.NumberFormat('en-US', {
		notation: 'compact',
		maximumFractionDigits: 1
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
			value: (day: DailyValue) => day.models.find((value) => value.model === model)?.tokens ?? 0
		}))
	);
	const padding = { top: 4, right: 24, bottom: 20, left: 41 };
</script>

<ChartCard title={m.tokens_per_day_heading()} subtitle={m.daily_model_token_subtitle()}>
	<div
		role="img"
		aria-label={m.daily_model_token_chart_aria({
			modelCount: models.length,
			dayCount: dayValues.length
		})}
	>
		<BarChart data={dayValues} x="label" {series} seriesLayout="stack" height={270} {padding}>
			{#snippet tooltip()}
				<Tooltip.Root>
					{#snippet children({ data })}
						{#each data.models as model (model.model)}
							<Tooltip.Header>
								{m.daily_model_token_value_title({
									date: formatDay(data.day),
									model: model.model,
									value: compactNumber.format(model.tokens)
								})}
							</Tooltip.Header>
						{/each}
					{/snippet}
				</Tooltip.Root>
			{/snippet}
		</BarChart>
	</div>
</ChartCard>
