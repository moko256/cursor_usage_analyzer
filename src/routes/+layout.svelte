<script module lang="ts">
	import '@picocss/pico/css/pico.min.css';
</script>

<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import LocaleAnchor from '$lib/components/LocaleAnchor.svelte';
	import HeadUrlLinks from '$lib/components/HeadUrlLinks.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />

	<HeadUrlLinks />
</svelte:head>

{@render children()}

<LocaleAnchor />
