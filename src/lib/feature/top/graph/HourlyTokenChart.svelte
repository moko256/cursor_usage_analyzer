<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { BarChart, Tooltip } from 'layerchart/svg';
	import ChartCard from './ChartCard.svelte';
	import {
		compactNumberFormat,
		formatHour,
		formatTokenAxis,
		HOURLY_TOKEN_COLOR,
		hourlyAxisTickLabels,
		verticalChartHeight,
		verticalChartPadding,
		type HourlyValue
	} from './chart-utils';

	interface Props {
		hours: HourlyValue[];
	}

	let { hours }: Props = $props();
	const series = [
		{
			key: 'tokens',
			color: HOURLY_TOKEN_COLOR,
			value: (hour: HourlyValue) => hour.tokens
		}
	];
	const hourTicks = hourlyAxisTickLabels();
	let hourValues = $derived(
		hours.map((hour) => ({
			...hour,
			label: formatHour(hour.hour)
		}))
	);
</script>

<ChartCard
	title={m.tokens_per_hour_heading()}
	subtitle={m.hourly_token_subtitle()}
	ariaLabel={m.hourly_token_chart_aria({ hourCount: hourValues.length })}
	class="hourly-token-card"
>
	<BarChart
		data={hourValues}
		x="label"
		{series}
		padding={verticalChartPadding}
		height={verticalChartHeight}
		props={{
			xAxis: { ticks: hourTicks },
			yAxis: { format: formatTokenAxis }
		}}
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
</ChartCard>
