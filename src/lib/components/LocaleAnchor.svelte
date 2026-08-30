<script lang="ts">
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';

	export const prerender = true;

	// HTMLを直で開いた場合にroute.idが取れないため、その場合は使用しないようにする
	let resolveAvailable = $derived((page.route.id?.length ?? 0) > 0);
	let localesAndLinks = $derived(
		resolveAvailable
			? locales.map((locale) => {
					return {
						locale: locale,
						link: localizeHref(page.url.pathname, { locale })
					};
				})
			: []
	);
</script>

<div data-sveltekit-reload>
	{#each localesAndLinks as localeAndLink}
		<a href={localeAndLink.link}>{localeAndLink.locale}</a>
	{/each}
</div>
