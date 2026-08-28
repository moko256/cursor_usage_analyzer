<script lang="ts">
	import type { CsvPoint } from '$lib/csv-parser';
	import { BarChart } from 'layerchart';
	import { groupByModel } from './chart-utils';

	interface Props {
		points: CsvPoint[];
	}

	let { points }: Props = $props();
	let modelValues = $derived(groupByModel(points));
	let horizontalChartHeight = $derived(Math.max(190, modelValues.length * 36 + 55));
</script>

<BarChart
	data={modelValues}
	x="tokens"
	y="model"
	orientation="horizontal"
	height={horizontalChartHeight}
/>
