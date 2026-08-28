<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<section class="graph-group" aria-label="コストチャート">
	{@render children()}
</section>

<style>
	.graph-group {
		display: grid;
		min-width: 0;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--pico-spacing);
	}

	@media (max-width: 700px) {
		.graph-group {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
