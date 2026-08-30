<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { type Pathname } from '$app/types';
	import { locales, localizeHref } from '$lib/paraglide/runtime';

	export const prerender = true;

	// HTMLを直で開いた場合にroute.idが取れないため、その場合は使用しないようにする
	let resolveAvailable = $derived((page.route.id?.length ?? 0) > 0);
	let localesAndLinks = $derived(
		resolveAvailable
			? locales.map((locale) => {
					return {
						locale: locale,
						link: localizeHref(resolve(page.route.id ?? ('' as Pathname)), { locale })
					};
				})
			: []
	);
</script>

<div style="display:none">
	{#each localesAndLinks as localeAndLink}
		<a href={localeAndLink.link}>{localeAndLink.locale}</a>
	{/each}
</div>
