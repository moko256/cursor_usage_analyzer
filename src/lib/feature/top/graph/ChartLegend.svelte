<script lang="ts">
	type ChartLegendItem = {
		key: string;
		label: string;
		color: string;
	};

	interface Props {
		items: ChartLegendItem[];
	}

	let { items }: Props = $props();
</script>

{#if items.length > 0}
	<ul class="chart-legend">
		{#each items as item (item.key)}
			<li>
				<span class="swatch" style:background-color={item.color} aria-hidden="true"></span>
				{item.label}
			</li>
		{/each}
	</ul>
{/if}

<style>
	.chart-legend {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.25rem 1rem;
		margin: 0;
		padding: 0.35rem 0.5rem 0.15rem;
		list-style: none;
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin: 0;
		min-width: 0;
		font-size: 0.75rem;
		line-height: 1.25;
		list-style: none;
	}

	.swatch {
		width: 0.75rem;
		height: 0.75rem;
		flex-shrink: 0;
		border-radius: 9999px;
	}
</style>
