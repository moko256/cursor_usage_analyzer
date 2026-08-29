<script lang="ts">
	import type { CsvPoint } from '$lib/csv-parser';
	import * as m from '$lib/paraglide/messages';
	import { BarChart, Tooltip } from 'layerchart';
	import { formatDay, groupByDay } from './chart-utils';

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
</script>

<article class="chart-card">
	<figure>
		<figcaption>
			<strong>{m.cost_per_day_heading()}</strong>
			<span>{m.daily_cost_subtitle()}</span>
		</figcaption>
		<div role="img" aria-label={m.daily_cost_chart_aria({ count: dayValues.length })}>
			<BarChart data={dayValues} x="label" y="cost" height={270}>
				{#snippet tooltip({ context })}
					<Tooltip.Root>
						{#snippet children({ data })}
							<Tooltip.Header>
								{m.daily_cost_value_title({
									date: formatDay(data.day),
									value: currency.format(context.y(data))
								})}
							</Tooltip.Header>
						{/snippet}
					</Tooltip.Root>
				{/snippet}
			</BarChart>
		</div>
	</figure>
</article>
