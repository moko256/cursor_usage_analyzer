<script lang="ts">
	import type { CsvPoint } from '$lib/csv-parser';
	import * as m from '$lib/paraglide/messages';
	import { BarChart, Tooltip } from 'layerchart/svg';
	import ChartCard from './ChartCard.svelte';
	import { formatHour, groupByHour, type HourlyValue } from './chart-utils';

	interface Props {
		points: CsvPoint[];
	}

	let { points }: Props = $props();
	const compactNumber = new Intl.NumberFormat('en-US', {
		notation: 'compact',
		maximumFractionDigits: 1
	});
	const series = [
		{
			key: 'tokens',
			color: 'var(--pico-primary)',
			value: (hour: HourlyValue) => hour.tokens
		}
	];
	const padding = { top: 4, right: 24, bottom: 20, left: 41 };
	let hourValues = $derived(
		groupByHour(points).map((hour) => ({
			...hour,
			label: formatHour(hour.hour)
		}))
	);
</script>

<ChartCard
	title={m.tokens_per_hour_heading()}
	subtitle={m.hourly_token_subtitle()}
	class="hourly-token-card"
>
	<div role="img" aria-label={m.hourly_token_chart_aria({ hourCount: hourValues.length })}>
		<BarChart data={hourValues} x="label" {series} height={270} {padding}>
			{#snippet tooltip()}
				<Tooltip.Root>
					{#snippet children({ data })}
						<Tooltip.Header>
							{m.hourly_token_value_title({
								hour: formatHour(data.hour),
								value: compactNumber.format(data.tokens)
							})}
						</Tooltip.Header>
					{/snippet}
				</Tooltip.Root>
			{/snippet}
		</BarChart>
	</div>
</ChartCard>
