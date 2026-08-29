<script module lang="ts">
	import '@picocss/pico/css/pico.min.css';
</script>

<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { page } from '$app/state';
	import { locales, localizeHref, type Locale } from '$lib/paraglide/runtime';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	// The configured URL patterns include the base path, so Paraglide already
	// returns hrefs that need no further resolving.
	const localePathname = (locale: Locale) =>
		localizeHref(page.url.pathname, { locale }) as ResolvedPathname;
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={localePathname(locale)}>{locale}</a>
	{/each}
</div>
