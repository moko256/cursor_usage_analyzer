<script lang="ts">
	import { baseLocale, locales, localizeHref } from '$lib/paraglide/runtime';
	import { currentPageAbsoluteUrl } from '$lib/site-url-resolver';

	let absoluteUrl = $derived(currentPageAbsoluteUrl());
	let absoluteUrlString = $derived(absoluteUrl.toString());

	let localeAndLinks = $derived(
		locales.map((locale) => {
			return { locale: locale, link: localizeHref(absoluteUrlString, { locale }) };
		})
	);
	let defaultLocaleLinks = $derived(localizeHref(absoluteUrlString, { locale: baseLocale }));
</script>

<link rel="canonical" href={absoluteUrlString} />

{#each localeAndLinks as localeAndLink (localeAndLink.locale)}
	<link rel="alternate" hreflang={localeAndLink.locale} href={localeAndLink.link} />
{/each}
<link rel="alternate" hreflang="x-default" href={defaultLocaleLinks} />
