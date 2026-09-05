<script lang="ts">
	import icon_svg from '$lib/assets/icons/icon.svg';
	import LocaleAnchor from '$lib/components/LocaleAnchor.svelte';
	import HeadUrlLinks from '$lib/components/HeadUrlLinks.svelte';
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';
	import { applyDocumentLocale } from '$lib/html-lang';

	let { children } = $props();
</script>

<svelte:document
	{@attach (doc) => {
		applyDocumentLocale(doc.documentElement, page.url);
	}}
/>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="text-scale" content="scale" />

	<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#13171f" media="(prefers-color-scheme: dark)" />

	<link rel="manifest" href={resolve('/manifest.webmanifest')} />
	<link rel="icon" href={asset('/favicon.ico')} sizes="16x16" />
	<link rel="icon" href={icon_svg} type="image/svg+xml" />
	<link rel="apple-touch-icon" href={asset('/apple-touch-icon.png')} />

	<HeadUrlLinks />
</svelte:head>

{@render children()}

<LocaleAnchor />

<style>
	@import 'kiso.css';
	@import '$lib/styles/pico.scss';
</style>
