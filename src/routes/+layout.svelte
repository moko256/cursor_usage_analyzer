<script module lang="ts">
	import '@picocss/pico/css/pico.min.css';
</script>

<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { baseLocale, locales, localizeHref } from '$lib/paraglide/runtime';
	import favicon from '$lib/assets/favicon.svg';
	import { currentPageAbsoluteUrl } from '$lib/site-url';

	let absoluteUrl = currentPageAbsoluteUrl();
	let absoluteUrlString = absoluteUrl.toString();

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />

	<link rel="canonical" href={absoluteUrlString} />

	{#each locales as locale}
		<link rel="alternate" hreflang={locale} href={localizeHref(absoluteUrlString, { locale })} />
	{/each}
	<link
		rel="alternate"
		hreflang="x-default"
		href={localizeHref(absoluteUrlString, { locale: baseLocale })}
	/>
</svelte:head>
{@render children()}

<div style="display:none">
	{#each locales as locale}
		<a href={localizeHref(resolve(page.route.id ?? ('' as Pathname)), { locale })}>{locale}</a>
	{/each}
</div>
