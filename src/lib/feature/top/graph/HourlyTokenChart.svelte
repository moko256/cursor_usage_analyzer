<script lang="ts">
	import type { CsvPoint } from '$lib/csv-parser';
	import * as m from '$lib/paraglide/messages';
	import { BarChart, Tooltip } from 'layerchart/svg';
	import ChartCard from './ChartCard.svelte';
	import {
		compactNumberFormat,
		formatHour,
		formatTokenAxis,
		groupByHour,
		verticalChartHeight,
		verticalChartPadding,
		type HourlyValue
	} from './chart-utils';

	interface Props {
		points: CsvPoint[];
	}

	let { points }: Props = $props();
	const series = [
		{
			key: 'tokens',
			color: 'var(--pico-primary)',
			value: (hour: HourlyValue) => hour.tokens
		}
	];
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
		<BarChart
			data={hourValues}
			x="label"
			{series}
			padding={verticalChartPadding}
			height={verticalChartHeight}
			props={{ yAxis: { format: formatTokenAxis } }}
		>
			{#snippet tooltip()}
				<Tooltip.Root>
					{#snippet children({ data })}
						<Tooltip.Header>
							{m.hourly_token_value_title({
								hour: formatHour(data.hour),
								value: compactNumberFormat.format(data.tokens)
							})}
						</Tooltip.Header>
					{/snippet}
				</Tooltip.Root>
			{/snippet}
		</BarChart>
	</div>
</ChartCard>
