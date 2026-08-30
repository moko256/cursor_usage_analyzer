<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import LocaleAnchor from '$lib/components/LocaleAnchor.svelte';
	import HeadUrlLinks from '$lib/components/HeadUrlLinks.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="text-scale" content="scale" />

	<link rel="icon" href={favicon} />

	<HeadUrlLinks />
</svelte:head>

{@render children()}

<LocaleAnchor />

<style>
	@import 'kiso.css';
	@import '@picocss/pico/css/pico.blue.min.css';
</style>
