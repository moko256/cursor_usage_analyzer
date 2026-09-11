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
		position: relative;
		min-width: 0;
	}

	.graph-group :global(.graph-range) {
		min-width: 0;
	}

	.graph-group :global(.graph-range.is-active) {
		position: relative;
	}

	.graph-group :global(.graph-range:not(.is-active)) {
		position: absolute;
		inset-inline: 0;
		top: 0;
		visibility: hidden;
		pointer-events: none;
	}

	@media print {
		.graph-group {
			position: static;
		}

		.graph-group :global(.graph-range.is-active) {
			position: static;
		}

		.graph-group :global(.graph-range:not(.is-active)) {
			display: none;
		}
	}
</style>
