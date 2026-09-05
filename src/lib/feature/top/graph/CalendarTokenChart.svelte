<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { scaleThreshold } from 'd3-scale';
	import { Calendar, Chart, Layer, Rect, Tooltip } from 'layerchart/svg';
	import {
		buildTokenCalendar,
		buildTokenCalendarThresholds,
		compactNumberFormat,
		TOKEN_CALENDAR_COLORS,
		type DailyValue
	} from './chart-utils';
	import ChartCard from './ChartCard.svelte';
	import { chartTooltipRootProps } from './chart-tooltip';

	interface Props {
		days: DailyValue[];
		maxDailyTokens: number;
	}

	let { days, maxDailyTokens }: Props = $props();
	const cellPadding = 1;
	const tokenScale = scaleThreshold<number, string>().unknown('transparent');
	let calendar = $derived(buildTokenCalendar(days));
	let tokenThresholds = $derived(buildTokenCalendarThresholds(maxDailyTokens));
</script>

<ChartCard
	ariaLabel={m.token_calendar_chart_aria({ dayCount: calendar.data.length })}
	class="calendar-card"
>
	<Chart
		data={calendar.data}
		x="date"
		c="tokens"
		cScale={tokenScale}
		cDomain={tokenThresholds}
		cRange={TOKEN_CALENDAR_COLORS}
		axis={false}
		tooltipContext
		padding={{ top: 20 }}
		height={140}
	>
		{#snippet children({ context })}
			<Layer>
				<Calendar start={calendar.range.start} end={calendar.range.end}>
					{#snippet children({ cells, cellSize })}
						{#each cells as cell (cell.data.day)}
							<Rect
								x={cell.x + cellPadding}
								y={cell.y + cellPadding}
								width={cellSize[0] - cellPadding * 2}
								height={cellSize[1] - cellPadding * 2}
								rx={4}
								fill={cell.color ?? TOKEN_CALENDAR_COLORS[0]}
								onpointermove={(event) => context.tooltip?.show(event, cell.data)}
								onpointerleave={() => context.tooltip?.hide()}
							/>
						{/each}
					{/snippet}
				</Calendar>
			</Layer>

			<Tooltip.Root contained={false} props={{ root: chartTooltipRootProps }}>
				{#snippet children({ data })}
					<Tooltip.Header value={data.date} format="day" />
					<Tooltip.List>
						<Tooltip.Item
							label="tokens"
							value={compactNumberFormat.format(data.tokens)}
							valueAlign="right"
						/>
					</Tooltip.List>
				{/snippet}
			</Tooltip.Root>
		{/snippet}
	</Chart>
</ChartCard>
