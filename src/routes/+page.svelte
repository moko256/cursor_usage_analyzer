<script lang="ts">
	import '@awesome.me/webawesome/dist/components/badge/badge.js';
	import '@awesome.me/webawesome/dist/components/button/button.js';
	import '@awesome.me/webawesome/dist/components/card/card.js';
	import '@awesome.me/webawesome/dist/components/callout/callout.js';
	import '@awesome.me/webawesome/dist/components/divider/divider.js';
	import '@awesome.me/webawesome/dist/components/progress-bar/progress-bar.js';
	import '@awesome.me/webawesome/dist/components/progress-ring/progress-ring.js';
	import '@awesome.me/webawesome/dist/components/spinner/spinner.js';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';

	let syncState = $state<'ready' | 'syncing' | 'complete'>('ready');
	let syncProgress = $derived(syncState === 'complete' ? 100 : syncState === 'syncing' ? 68 : 42);
	let statusLabel = $derived(
		syncState === 'complete'
			? 'Workspace synced'
			: syncState === 'syncing'
				? 'Syncing components…'
				: 'Ready for a tour'
	);

	function runSync() {
		syncState = 'syncing';
		setTimeout(() => {
			syncState = 'complete';
		}, 700);
	}

	function activateSync(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			runSync();
		}
	}
</script>

<svelte:head>
	<title>Web Awesome Studio · Overview</title>
	<meta
		name="description"
		content="A polished, interactive Web Awesome component showcase built with Svelte 5."
	/>
</svelte:head>

<div class="page">
	<section class="hero" aria-labelledby="overview-title">
		<div class="hero-copy">
			<div class="eyebrow">
				<span class="eyebrow-line"></span>
				<span>Component playground</span>
				<wa-badge variant="brand">v3.11</wa-badge>
			</div>
			<h1 id="overview-title">Build interfaces that feel <em>instantly familiar.</em></h1>
			<p class="lede">
				Explore a small, practical set of Web Awesome components wired into Svelte 5 runes. Each
				page is a focused example you can adapt to your own product.
			</p>
			<div class="hero-actions">
				<wa-button
					variant="brand"
					size="l"
					role="button"
					tabindex="0"
					onclick={runSync}
					onkeydown={activateSync}
				>
					{syncState === 'syncing' ? 'Working…' : 'Run a live action'}
				</wa-button>
				<a class="text-link" href={resolve(localizeHref('/forms') as Pathname)}
					>Explore form controls <span aria-hidden="true">↗</span></a
				>
			</div>
		</div>

		<wa-card class="status-card">
			<div class="status-header">
				<div>
					<span class="card-kicker">Workspace pulse</span>
					<h2>Everything is in rhythm</h2>
				</div>
				<wa-progress-ring value={syncProgress} label={`${syncProgress}% synced`}></wa-progress-ring>
			</div>
			<wa-divider></wa-divider>
			<div class="status-row">
				<span class={syncState === 'syncing' ? 'status-indicator busy' : 'status-indicator'}></span>
				<strong>{statusLabel}</strong>
				{#if syncState === 'syncing'}
					<wa-spinner label="Syncing"></wa-spinner>
				{:else if syncState === 'complete'}
					<span class="status-check" aria-label="Complete">✓</span>
				{/if}
			</div>
			<wa-progress-bar value={syncProgress} label="Workspace sync progress"></wa-progress-bar>
			<p class="muted">12 components loaded · 0 configuration warnings</p>
		</wa-card>
	</section>

	<section class="intro-row" aria-labelledby="explore-title">
		<div>
			<span class="section-label">Three ways in</span>
			<h2 id="explore-title">A UI kit with good instincts.</h2>
		</div>
		<p>
			From quiet forms to decisive feedback, the demos pair Web Awesome primitives with useful
			interaction patterns.
		</p>
	</section>

	<section class="feature-grid" aria-label="Demo pages">
		<a class="feature-link" href={resolve(localizeHref('/forms') as Pathname)}>
			<wa-card class="feature-card">
				<div class="feature-icon violet" aria-hidden="true">01</div>
				<div class="feature-topline">
					<span class="card-kicker">Forms</span>
					<span class="arrow" aria-hidden="true">↗</span>
				</div>
				<h3>Inputs with intent</h3>
				<p>See validation-friendly fields, selects, toggles, range controls, and live feedback.</p>
				<div class="feature-foot">12 controls <span>→</span></div>
			</wa-card>
		</a>
		<a class="feature-link" href={resolve(localizeHref('/feedback') as Pathname)}>
			<wa-card class="feature-card">
				<div class="feature-icon amber" aria-hidden="true">02</div>
				<div class="feature-topline">
					<span class="card-kicker">Feedback</span>
					<span class="arrow" aria-hidden="true">↗</span>
				</div>
				<h3>Moments that respond</h3>
				<p>Open a dialog, slide in a drawer, and give people clear next steps when it matters.</p>
				<div class="feature-foot">Dialog + drawer <span>→</span></div>
			</wa-card>
		</a>
		<wa-card class="principle-card">
			<div class="principle-mark" aria-hidden="true">✦</div>
			<span class="card-kicker">The principle</span>
			<h3>Familiar is a feature.</h3>
			<p>
				Use patterns people already understand, then give them just enough personality to remember.
			</p>
			<div class="quote-line"></div>
			<span class="muted">Web Awesome × Svelte 5</span>
		</wa-card>
	</section>
</div>

<style>
	.page {
		display: grid;
		gap: 5rem;
	}

	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
		align-items: center;
		gap: clamp(2rem, 7vw, 7rem);
		padding: clamp(1rem, 4vw, 4rem) 0 1rem;
	}

	.eyebrow,
	.hero-actions,
	.status-row,
	.feature-topline,
	.feature-foot {
		display: flex;
		align-items: center;
	}

	.eyebrow {
		gap: 0.55rem;
		color: var(--wa-color-text-quiet);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.eyebrow-line {
		width: 1.5rem;
		height: 1px;
		background: var(--wa-color-brand-fill-loud);
	}

	h1,
	h2,
	h3,
	p {
		margin: 0;
	}

	h1 {
		max-width: 680px;
		margin-top: 1.2rem;
		font-size: clamp(2.8rem, 6vw, 5.75rem);
		font-weight: 760;
		letter-spacing: -0.065em;
		line-height: 0.98;
	}

	h1 em {
		color: var(--wa-color-brand-on-quiet);
		font-style: normal;
	}

	.lede {
		max-width: 580px;
		margin-top: 1.5rem;
		color: var(--wa-color-text-quiet);
		font-size: 1.05rem;
		line-height: 1.7;
	}

	.hero-actions {
		flex-wrap: wrap;
		gap: 1.5rem;
		margin-top: 2rem;
	}

	.text-link {
		color: var(--wa-color-text-normal);
		font-size: 0.9rem;
		font-weight: 700;
		text-underline-offset: 0.3rem;
	}

	.text-link span {
		margin-left: 0.25rem;
		color: var(--wa-color-brand-on-quiet);
	}

	.status-card {
		--padding: clamp(1.2rem, 3vw, 2rem);
		box-shadow: 0 1.5rem 4rem color-mix(in srgb, var(--wa-color-brand-90) 45%, transparent);
	}

	.status-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.card-kicker,
	.section-label {
		display: block;
		color: var(--wa-color-text-quiet);
		font-size: 0.7rem;
		font-weight: 750;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.status-header h2 {
		margin-top: 0.45rem;
		font-size: 1.25rem;
		letter-spacing: -0.03em;
	}

	.status-header :global(wa-progress-ring) {
		--size: 3.4rem;
		--track-width: 0.35rem;
		--indicator-width: 0.35rem;
		--indicator-color: var(--wa-color-brand-fill-loud);
		font-size: 0.68rem;
		font-weight: 800;
	}

	.status-card :global(wa-divider) {
		margin: 1.2rem 0;
	}

	.status-row {
		gap: 0.55rem;
		margin-bottom: 1rem;
		font-size: 0.85rem;
	}

	.status-indicator {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--wa-color-green-50);
		box-shadow: 0 0 0 0.25rem var(--wa-color-green-95);
	}

	.status-indicator.busy {
		background: var(--wa-color-brand-fill-loud);
		box-shadow: 0 0 0 0.25rem var(--wa-color-brand-fill-quiet);
	}

	.status-row :global(wa-spinner) {
		--indicator-color: var(--wa-color-brand-fill-loud);
		margin-left: auto;
	}

	.status-check {
		margin-left: auto;
		color: var(--wa-color-green-50);
		font-weight: 800;
	}

	.muted {
		margin-top: 0.8rem;
		color: var(--wa-color-text-quiet);
		font-size: 0.75rem;
	}

	.intro-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		align-items: end;
		border-top: 1px solid var(--wa-color-surface-border);
		padding-top: 1.5rem;
	}

	.intro-row h2 {
		margin-top: 0.45rem;
		font-size: clamp(1.6rem, 3vw, 2.45rem);
		letter-spacing: -0.05em;
	}

	.intro-row p {
		max-width: 420px;
		justify-self: end;
		color: var(--wa-color-text-quiet);
		font-size: 0.92rem;
		line-height: 1.65;
	}

	.feature-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}

	.feature-link {
		display: block;
		text-decoration: none;
	}

	.feature-card,
	.principle-card {
		height: 100%;
		transition:
			transform 180ms ease,
			box-shadow 180ms ease;
	}

	.feature-link:hover .feature-card {
		transform: translateY(-0.35rem);
		box-shadow: var(--wa-shadow-large);
	}

	.feature-icon {
		display: grid;
		place-items: center;
		width: 2.4rem;
		height: 2.4rem;
		margin-bottom: 2.8rem;
		border-radius: 0.7rem;
		font-size: 0.7rem;
		font-weight: 800;
	}

	.feature-icon.violet {
		background: var(--wa-color-purple-95);
		color: var(--wa-color-purple-40);
	}

	.feature-icon.amber {
		background: var(--wa-color-orange-95);
		color: var(--wa-color-orange-40);
	}

	.feature-topline {
		justify-content: space-between;
	}

	.arrow {
		color: var(--wa-color-text-quiet);
		font-size: 1.15rem;
	}

	.feature-card h3,
	.principle-card h3 {
		margin-top: 0.55rem;
		font-size: 1.25rem;
		letter-spacing: -0.035em;
	}

	.feature-card p,
	.principle-card p {
		margin-top: 0.75rem;
		color: var(--wa-color-text-quiet);
		font-size: 0.86rem;
		line-height: 1.6;
	}

	.feature-foot {
		justify-content: space-between;
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid var(--wa-color-surface-border);
		color: var(--wa-color-text-quiet);
		font-size: 0.72rem;
		font-weight: 700;
	}

	.feature-foot span {
		color: var(--wa-color-brand-on-quiet);
		font-size: 1.1rem;
	}

	.principle-card {
		background: var(--wa-color-neutral-fill-loud);
		color: var(--wa-color-neutral-95);
	}

	.principle-card :global(.card-kicker),
	.principle-card p,
	.principle-card .muted {
		color: var(--wa-color-neutral-60);
	}

	.principle-mark {
		margin-bottom: 2.8rem;
		color: var(--wa-color-brand-50);
		font-size: 1.5rem;
	}

	.quote-line {
		width: 3rem;
		height: 1px;
		margin: 1.8rem 0 0.7rem;
		background: var(--wa-color-brand-50);
	}

	@media (max-width: 820px) {
		.hero,
		.feature-grid {
			grid-template-columns: 1fr;
		}

		.hero {
			gap: 3rem;
		}

		.intro-row {
			grid-template-columns: 1fr;
		}

		.intro-row p {
			justify-self: start;
		}
	}
</style>
