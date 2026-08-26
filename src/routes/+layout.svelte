<script module lang="ts">
	import '@awesome.me/webawesome/dist/styles/webawesome.css';
	import { base } from '$app/paths';

	const basePath = base;
</script>

<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { getLocaleForUrl, locales, localizeHref } from '$lib/paraglide/runtime';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
	let currentPath = $derived(page.url.pathname.replace(basePath, '') || '/');
	let currentLocale = $derived(getLocaleForUrl(page.url));

	const navigation = [
		{ href: '/', label: 'Overview' },
		{ href: '/forms', label: 'Forms' },
		{ href: '/feedback', label: 'Feedback' }
	] as const;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	<header class="site-header">
		<a class="brand" href={resolve(localizeHref('/') as Pathname)}>
			<span class="brand-mark" aria-hidden="true">wa</span>
			<span>
				<strong>Web Awesome</strong>
				<small>Svelte demo studio</small>
			</span>
		</a>

		<nav aria-label="Primary navigation">
			{#each navigation as item (item.href)}
				<a
					href={resolve(localizeHref(item.href) as Pathname)}
					aria-current={currentPath === item.href ? 'page' : undefined}
					class={currentPath === item.href ? 'nav-link active' : 'nav-link'}
				>
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="locale-switcher" aria-label="Language">
			{#each locales as locale (locale)}
				<a
					href={resolve(localizeHref(currentPath, { locale }) as Pathname)}
					class={locale === currentLocale ? 'locale active' : 'locale'}
					aria-current={locale === currentLocale ? 'true' : undefined}
				>
					{locale.toUpperCase()}
				</a>
			{/each}
		</div>
	</header>

	<main>{@render children()}</main>

	<footer class="site-footer">
		<span>Built with Web Awesome components and Svelte 5 runes.</span>
		<span>Accessible by default · Cherry-picked imports</span>
	</footer>
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		background:
			radial-gradient(
				circle at 12% 0%,
				color-mix(in srgb, var(--wa-color-brand-50) 70%, transparent),
				transparent 32rem
			),
			var(--wa-color-surface-lowered);
		color: var(--wa-color-text-normal);
		font-family: var(--wa-font-family-sans);
	}

	:global(a) {
		color: inherit;
	}

	.app-shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.site-header,
	.site-footer,
	main {
		width: min(1180px, calc(100% - 2rem));
		margin: 0 auto;
	}

	.site-header {
		display: flex;
		align-items: center;
		gap: 2rem;
		padding: 1.25rem 0;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.7rem;
		text-decoration: none;
		white-space: nowrap;
	}

	.brand-mark {
		display: grid;
		place-items: center;
		width: 2.35rem;
		height: 2.35rem;
		border-radius: 0.7rem;
		background: var(--wa-color-brand-fill-loud);
		color: var(--wa-color-neutral-05);
		font-size: 0.85rem;
		font-weight: 800;
		letter-spacing: -0.08em;
	}

	.brand strong,
	.brand small {
		display: block;
	}

	.brand strong {
		font-size: 0.96rem;
	}

	.brand small {
		margin-top: 0.1rem;
		color: var(--wa-color-text-quiet);
		font-size: 0.7rem;
	}

	nav {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin-left: auto;
	}

	.nav-link,
	.locale {
		border-radius: 999px;
		text-decoration: none;
		transition:
			background 160ms ease,
			color 160ms ease;
	}

	.nav-link {
		padding: 0.55rem 0.85rem;
		color: var(--wa-color-text-quiet);
		font-size: 0.88rem;
		font-weight: 600;
	}

	.nav-link:hover,
	.nav-link.active {
		background: var(--wa-color-surface-default);
		color: var(--wa-color-text-normal);
	}

	.nav-link.active {
		box-shadow: 0 0 0 1px var(--wa-color-surface-border);
	}

	.locale-switcher {
		display: flex;
		gap: 0.15rem;
		padding: 0.2rem;
		border: 1px solid var(--wa-color-surface-border);
		border-radius: 999px;
		background: color-mix(in srgb, var(--wa-color-surface-default) 80%, transparent);
	}

	.locale {
		padding: 0.3rem 0.5rem;
		color: var(--wa-color-text-quiet);
		font-size: 0.68rem;
		font-weight: 700;
	}

	.locale:hover,
	.locale.active {
		background: var(--wa-color-brand-fill-quiet);
		color: var(--wa-color-brand-on-quiet);
	}

	main {
		flex: 1;
		padding: 2rem 0 5rem;
	}

	.site-footer {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.25rem 0 2rem;
		color: var(--wa-color-text-quiet);
		font-size: 0.75rem;
	}

	@media (max-width: 700px) {
		.site-header {
			flex-wrap: wrap;
			gap: 1rem;
		}

		nav {
			order: 3;
			width: 100%;
			margin-left: 0;
			overflow-x: auto;
		}

		.nav-link {
			padding-inline: 0.7rem;
		}

		main {
			padding-top: 1rem;
		}

		.site-footer {
			flex-direction: column;
			gap: 0.35rem;
		}
	}
</style>
