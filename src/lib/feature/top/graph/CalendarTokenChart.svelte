<script lang="ts">
	import type { CsvPoint } from '$lib/csv-parser';
	import * as m from '$lib/paraglide/messages';
	import { scaleThreshold } from 'd3-scale';
	import { Calendar, Chart, Layer, Rect, Tooltip } from 'layerchart';
	import { buildTokenCalendar, groupByDay } from './chart-utils';
	import ChartCard from './ChartCard.svelte';

	interface Props {
		points: CsvPoint[];
	}

	let { points }: Props = $props();
	const compactNumber = new Intl.NumberFormat('en-US', {
		notation: 'compact',
		maximumFractionDigits: 1
	});
	const tokenThresholds = [1, 10_000, 50_000, 100_000];
	const tokenColors = [
		'color-mix(in srgb, var(--pico-muted-color) 18%, var(--pico-background-color))',
		'color-mix(in srgb, var(--pico-primary) 25%, var(--pico-background-color))',
		'color-mix(in srgb, var(--pico-primary) 45%, var(--pico-background-color))',
		'color-mix(in srgb, var(--pico-primary) 70%, var(--pico-background-color))',
		'var(--pico-primary)'
	] as const;
	const tokenScale = scaleThreshold<number, string>().unknown('transparent');
	let calendar = $derived(buildTokenCalendar(groupByDay(points)));
</script>

<ChartCard title="" subtitle="" class="calendar-card">
	<div role="img" aria-label={m.token_calendar_chart_aria({ dayCount: calendar.data.length })}>
		<Chart
			data={calendar.data}
			x="date"
			c="tokens"
			cScale={tokenScale}
			cDomain={tokenThresholds}
			cRange={tokenColors}
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
								{@const padding = 1}
								<Rect
									x={cell.x + padding}
									y={cell.y + padding}
									width={cellSize[0] - padding * 2}
									height={cellSize[1] - padding * 2}
									rx={4}
									fill={cell.color ?? 'rgb(0 0 0 / 5%)'}
									onpointermove={(event) => context.tooltip?.show(event, cell.data)}
									onpointerleave={() => context.tooltip?.hide()}
								/>
							{/each}
						{/snippet}
					</Calendar>
				</Layer>

				<Tooltip.Root>
					{#snippet children({ data })}
						<Tooltip.Header value={data.date} format="day" />
						<Tooltip.List>
							<Tooltip.Item
								label="tokens"
								value={compactNumber.format(data.tokens)}
								valueAlign="right"
							/>
						</Tooltip.List>
					{/snippet}
				</Tooltip.Root>
			{/snippet}
		</Chart>
	</div>
</ChartCard>
