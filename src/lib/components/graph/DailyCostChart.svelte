<script lang="ts">
	import type { CsvPoint } from '$lib/csv-parser';
	import { BarChart } from 'layerchart';
	import { formatDay, groupByDay } from './chart-utils';

	interface Props {
		points: CsvPoint[];
	}

	let { points }: Props = $props();
	let dayValues = $derived(
		groupByDay(points).map((day) => ({
			...day,
			label: formatDay(day.day)
		}))
	);
</script>

<BarChart data={dayValues} x="label" y="cost" height={270} />
