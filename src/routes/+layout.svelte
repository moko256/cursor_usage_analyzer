<script module lang="ts">
	import '@picocss/pico/css/pico.min.css';
	import { base } from '$app/paths';

	const basePath = base;
</script>

<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={resolve(localizeHref(page.url.pathname.replace(basePath, ''), { locale }) as Pathname)}
			>{locale}</a
		>
	{/each}
</div>
