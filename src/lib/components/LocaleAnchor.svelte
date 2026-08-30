<script lang="ts">
	import { base, resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Pathname, ResolvedPathname } from '$app/types';
	import { locales, localizeHref } from '$lib/paraglide/runtime';

	export const prerender = true;

	// HTMLを直で開いた場合にroute.idが取れないため、その場合は使用しないようにする
	let resolveAvailable = $derived((page.route.id?.length ?? 0) > 0);
	let localesAndLinks = $derived(
		resolveAvailable
			? locales.map((locale) => {
					return {
						locale: locale,
						link: localizeHref(page.url.pathname, { locale }) as ResolvedPathname
					};
				})
			: []
	);
</script>

<div data-sveltekit-reload style="display: none">
	{#each localesAndLinks as localeAndLink (localeAndLink.locale)}
		<a href={resolve((localeAndLink.link.slice(base.length) || '/') as Pathname)}
			>{localeAndLink.locale}</a
		>
	{/each}
</div>
