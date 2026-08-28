<script lang="ts">
	import type { CsvPoint } from '$lib/csv-parser';
	import { BarChart } from 'layerchart';
	import { formatDay, groupByDay, groupByModel, type DailyValue } from './chart-utils';

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
	let models = $derived(groupByModel(points).map((value) => value.model));
	let series = $derived(
		models.map((model) => ({
			key: model,
			value: (day: DailyValue) => day.models.find((value) => value.model === model)?.cost ?? 0
		}))
	);
</script>

<BarChart data={dayValues} x="label" {series} seriesLayout="stack" height={270} />
