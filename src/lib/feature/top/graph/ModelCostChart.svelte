<script lang="ts">
	import type { CsvPoint } from '$lib/csv-parser';
	import * as m from '$lib/paraglide/messages';
	import { BarChart, Tooltip } from 'layerchart/svg';
	import { MediaQuery } from 'svelte/reactivity';
	import {
		errorMinusColor,
		errorPlusColor,
		getDailyModelColors,
		groupByModelBreakdown,
		TOKEN_BREAKDOWN_LABELS,
		tokenBreakdownCost,
		tokenErrorMinusCost,
		tokenErrorPlusCost,
		type ModelBreakdownValue,
		type TokenBreakdownLabel,
		modelAxisPadding,
		truncateModelLabel
	} from './chart-utils';
	import ChartCard from './ChartCard.svelte';

	const isDark = new MediaQuery('(prefers-color-scheme: dark)');

	interface Props {
		points: CsvPoint[];
	}

	let { points }: Props = $props();
	const currency = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 2
	});
	let modelValues = $derived(groupByModelBreakdown(points));
	let horizontalChartHeight = $derived(Math.max(190, modelValues.length * 36 + 55));
	let padding = $derived(modelAxisPadding(modelValues.map((value) => value.model)));
	type BreakdownSeries = {
		key: string;
		color: string;
		value: (row: ModelBreakdownValue) => number;
	};

	let series = $derived(buildSeries(modelValues));

	function buildSeries(rows: ModelBreakdownValue[]): BreakdownSeries[] {
		const breakdownSeries: BreakdownSeries[] = TOKEN_BREAKDOWN_LABELS.map((label, index) => ({
			key: label,
			color: getDailyModelColors(index, TOKEN_BREAKDOWN_LABELS.length, isDark.current),
			value: (row: ModelBreakdownValue) => tokenBreakdownCost(row, label)
		}));

		if (rows.some((row) => row.errorMinus > 0)) {
			breakdownSeries.push({
				key: m.token_error_minus(),
				color: errorMinusColor,
				value: tokenErrorMinusCost
			});
		}

		if (rows.some((row) => row.errorPlus > 0)) {
			breakdownSeries.push({
				key: m.token_error_plus(),
				color: errorPlusColor,
				value: tokenErrorPlusCost
			});
		}

		return breakdownSeries;
	}

	function seriesCost(row: ModelBreakdownValue, key: string) {
		if (key === m.token_error_minus()) return tokenErrorMinusCost(row);
		if (key === m.token_error_plus()) return Math.abs(tokenErrorPlusCost(row));

		return tokenBreakdownCost(row, key as TokenBreakdownLabel);
	}
</script>

<ChartCard
	title={m.cost_per_model_heading()}
	subtitle={m.model_cost_subtitle()}
	class="horizontal-card"
>
	<div role="img" aria-label={m.model_cost_chart_aria()}>
		<BarChart
			data={modelValues}
			y="model"
			{series}
			seriesLayout="stack"
			orientation="horizontal"
			height={horizontalChartHeight}
			{padding}
			props={{ yAxis: { format: truncateModelLabel } }}
		>
			{#snippet tooltip()}
				<Tooltip.Root>
					{#snippet children({ data })}
						<Tooltip.Header>{data.model}</Tooltip.Header>
						{#each series as item (item.key)}
							{@const value = seriesCost(data, item.key)}
							<Tooltip.Item label={item.key} value={currency.format(value)} color={item.color} />
						{/each}
					{/snippet}
				</Tooltip.Root>
			{/snippet}
		</BarChart>
	</div>
</ChartCard>
