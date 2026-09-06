<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<section class="graph-group" aria-label={m.charts_aria_label()}>
	{@render children()}
</section>

<style>
	.graph-group {
		min-width: 0;
	}
</style>
