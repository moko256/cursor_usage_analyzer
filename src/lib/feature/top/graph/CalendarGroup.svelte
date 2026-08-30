<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<section class="calendar-group" aria-label={m.token_calendar_group_aria()}>
	{@render children()}
</section>

<style>
	.calendar-group {
		display: grid;
		min-width: 0;
		grid-template-columns: minmax(0, 7fr) minmax(0, 3fr);
		gap: var(--pico-spacing);
	}

	@media (max-width: 700px) {
		.calendar-group {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
