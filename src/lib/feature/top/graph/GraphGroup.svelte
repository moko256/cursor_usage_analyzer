<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';
	import { applyPrintCardBreaks, clearPrintCardBreaks } from './chart-print-breaks';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	function attachPrintBreaks(node: HTMLElement) {
		const media = window.matchMedia('print');
		const sync = () => {
			if (media.matches) applyPrintCardBreaks(node);
			else clearPrintCardBreaks(node);
		};
		const onBeforePrint = () => applyPrintCardBreaks(node);
		const onAfterPrint = () => clearPrintCardBreaks(node);

		media.addEventListener('change', sync);
		window.addEventListener('beforeprint', onBeforePrint);
		window.addEventListener('afterprint', onAfterPrint);
		sync();

		return () => {
			media.removeEventListener('change', sync);
			window.removeEventListener('beforeprint', onBeforePrint);
			window.removeEventListener('afterprint', onAfterPrint);
			clearPrintCardBreaks(node);
		};
	}
</script>

<section class="graph-group" aria-label={m.charts_aria_label()} {@attach attachPrintBreaks}>
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
