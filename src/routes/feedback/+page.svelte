<script lang="ts">
	import '@awesome.me/webawesome/dist/components/badge/badge.js';
	import '@awesome.me/webawesome/dist/components/button/button.js';
	import '@awesome.me/webawesome/dist/components/callout/callout.js';
	import '@awesome.me/webawesome/dist/components/card/card.js';
	import '@awesome.me/webawesome/dist/components/dialog/dialog.js';
	import '@awesome.me/webawesome/dist/components/divider/divider.js';
	import '@awesome.me/webawesome/dist/components/drawer/drawer.js';
	import '@awesome.me/webawesome/dist/components/input/input.js';
	import '@awesome.me/webawesome/dist/components/progress-ring/progress-ring.js';
	import '@awesome.me/webawesome/dist/components/textarea/textarea.js';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';

	let dialogOpen = $state(false);
	let drawerOpen = $state(false);
	let feedbackSent = $state(false);
	let name = $state('');
	let message = $state('');
	let statusPercent = $derived(feedbackSent ? 100 : drawerOpen ? 72 : 46);

	function submitFeedback(event: SubmitEvent) {
		event.preventDefault();
		feedbackSent = true;
		dialogOpen = false;
	}

	function activate(event: KeyboardEvent, action: () => void) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			action();
		}
	}
</script>

<svelte:head>
	<title>Web Awesome Studio · Feedback</title>
	<meta
		name="description"
		content="Explore accessible feedback patterns with Web Awesome dialogs and drawers in Svelte 5."
	/>
</svelte:head>

<div class="page">
	<section class="page-heading" aria-labelledby="feedback-title">
		<div>
			<a class="back-link" href={resolve(localizeHref('/') as Pathname)}>← Back to overview</a>
			<div class="eyebrow">Demo 02 · Feedback</div>
			<h1 id="feedback-title">Give every moment a clear shape.</h1>
		</div>
		<p>
			Dialogs focus attention. Drawers keep context close. Both should make the next action feel
			obvious.
		</p>
	</section>

	<wa-callout class="status-callout" variant={feedbackSent ? 'success' : 'brand'} open>
		<div class="callout-content">
			<div>
				<strong>{feedbackSent ? 'Feedback is on its way.' : 'A small interaction lab.'}</strong>
				<p>
					{feedbackSent
						? `Thanks${name ? `, ${name}` : ''}. Your note was captured as local demo state.`
						: 'Try both patterns below. The status card tracks the interaction as you go.'}
				</p>
			</div>
			<wa-progress-ring value={statusPercent} label={`${statusPercent}% complete`}
			></wa-progress-ring>
		</div>
	</wa-callout>

	<section class="pattern-grid" aria-label="Feedback patterns">
		<wa-card class="pattern-card dialog-card">
			<div class="pattern-number">01</div>
			<div class="pattern-meta">
				<span class="card-kicker">Dialog</span>
				<wa-badge variant="neutral">Focused</wa-badge>
			</div>
			<h2>Ask for a considered response.</h2>
			<p>
				Use a dialog when the task deserves a person’s full attention — like leaving a note without
				losing the page underneath.
			</p>
			<wa-divider></wa-divider>
			<div class="pattern-foot">
				<span>Accessible focus trap</span>
				<wa-button
					variant="brand"
					role="button"
					tabindex="0"
					onclick={() => (dialogOpen = true)}
					onkeydown={(event: KeyboardEvent) => activate(event, () => (dialogOpen = true))}
					>Open dialog</wa-button
				>
			</div>
		</wa-card>

		<wa-card class="pattern-card drawer-card">
			<div class="pattern-number">02</div>
			<div class="pattern-meta">
				<span class="card-kicker">Drawer</span>
				<wa-badge variant="neutral">Contextual</wa-badge>
			</div>
			<h2>Keep useful context within reach.</h2>
			<p>
				Use a drawer for secondary details, filters, or a quick checklist that supports the main
				flow without interrupting it.
			</p>
			<wa-divider></wa-divider>
			<div class="pattern-foot">
				<span>Light dismissal enabled</span>
				<wa-button
					variant="neutral"
					role="button"
					tabindex="0"
					onclick={() => (drawerOpen = true)}
					onkeydown={(event: KeyboardEvent) => activate(event, () => (drawerOpen = true))}
					>Open drawer</wa-button
				>
			</div>
		</wa-card>
	</section>

	<section class="principles" aria-labelledby="principles-title">
		<div>
			<span class="section-label">A useful rule</span>
			<h2 id="principles-title">Interrupt with purpose.</h2>
		</div>
		<div class="principle-list">
			<div>
				<strong>01 · Name the moment</strong>
				<span>Tell people why their attention is needed.</span>
			</div>
			<div>
				<strong>02 · Keep the exit close</strong>
				<span>Escape, close, and light dismissal all work together.</span>
			</div>
			<div>
				<strong>03 · Confirm the outcome</strong>
				<span>Replace uncertainty with a visible, calm status.</span>
			</div>
		</div>
	</section>
</div>

<wa-dialog
	label="Share feedback"
	open={dialogOpen}
	light-dismiss
	style="--width: min(32rem, calc(100vw - 2rem));"
	onwa-hide={() => (dialogOpen = false)}
>
	<p class="dialog-intro">A sentence or two is plenty. This stays in your browser for the demo.</p>
	<form id="feedback-form" onsubmit={submitFeedback}>
		<div class="dialog-fields">
			<wa-input
				label="Your name"
				placeholder="Avery Morgan"
				value={name}
				oninput={(event: Event) => (name = (event.currentTarget as HTMLInputElement).value)}
			></wa-input>
			<wa-textarea
				label="Your feedback"
				placeholder="The most useful thing about this demo is…"
				required
				value={message}
				oninput={(event: Event) => (message = (event.currentTarget as HTMLInputElement).value)}
			></wa-textarea>
		</div>
	</form>
	<wa-button
		slot="footer"
		variant="neutral"
		role="button"
		tabindex="0"
		data-dialog="close"
		onclick={() => (dialogOpen = false)}
		onkeydown={(event: KeyboardEvent) => activate(event, () => (dialogOpen = false))}
	>
		Cancel
	</wa-button>
	<wa-button slot="footer" variant="brand" type="submit" form="feedback-form"
		>Send feedback</wa-button
	>
</wa-dialog>

<wa-drawer
	label="Interaction notes"
	open={drawerOpen}
	light-dismiss
	style="--size: min(25rem, calc(100vw - 2rem));"
	onwa-hide={() => (drawerOpen = false)}
>
	<div class="drawer-body">
		<span class="card-kicker">While you explore</span>
		<h2>Good feedback is part of the flow.</h2>
		<p>
			Use a drawer when people may want to glance, compare, or adjust without losing their place.
		</p>
		<wa-divider></wa-divider>
		<ul>
			<li><span>01</span><strong>Preserve context</strong></li>
			<li><span>02</span><strong>Make dismissal easy</strong></li>
			<li><span>03</span><strong>Keep the scope focused</strong></li>
		</ul>
	</div>
	<wa-button
		slot="footer"
		variant="brand"
		role="button"
		tabindex="0"
		data-drawer="close"
		onclick={() => (drawerOpen = false)}
		onkeydown={(event: KeyboardEvent) => activate(event, () => (drawerOpen = false))}
	>
		Done exploring
	</wa-button>
</wa-drawer>

<style>
	.page {
		display: grid;
		gap: 3rem;
	}

	.page-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 2rem;
	}

	.page-heading > p {
		max-width: 350px;
		color: var(--wa-color-text-quiet);
		line-height: 1.65;
	}

	.back-link {
		display: inline-block;
		margin-bottom: 1.75rem;
		color: var(--wa-color-text-quiet);
		font-size: 0.78rem;
		font-weight: 650;
		text-underline-offset: 0.25rem;
	}

	.eyebrow,
	.card-kicker,
	.section-label {
		color: var(--wa-color-brand-on-quiet);
		font-size: 0.7rem;
		font-weight: 750;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.page-heading h1 {
		max-width: 680px;
		margin: 0.55rem 0 0;
		font-size: clamp(2.5rem, 6vw, 5.2rem);
		letter-spacing: -0.07em;
		line-height: 0.96;
	}

	.status-callout {
		--border-radius: var(--wa-border-radius-m);
	}

	.callout-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.callout-content p {
		margin: 0.45rem 0 0;
		font-size: 0.82rem;
		line-height: 1.5;
	}

	.callout-content :global(wa-progress-ring) {
		--size: 3rem;
		--track-width: 0.3rem;
		--indicator-width: 0.3rem;
		flex: 0 0 auto;
		font-size: 0.65rem;
		font-weight: 800;
	}

	.pattern-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.pattern-card {
		--padding: clamp(1.25rem, 4vw, 2.5rem);
	}

	.drawer-card {
		background: var(--wa-color-neutral-fill-loud);
		color: var(--wa-color-neutral-95);
	}

	.drawer-card :global(.card-kicker),
	.drawer-card p,
	.drawer-card .pattern-foot > span {
		color: var(--wa-color-neutral-60);
	}

	.pattern-number {
		margin-bottom: 3.5rem;
		color: var(--wa-color-brand-on-quiet);
		font-size: 0.75rem;
		font-weight: 800;
	}

	.pattern-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.pattern-card h2 {
		max-width: 340px;
		margin-top: 0.7rem;
		font-size: clamp(1.5rem, 3vw, 2.15rem);
		letter-spacing: -0.055em;
		line-height: 1.05;
	}

	.pattern-card p {
		max-width: 430px;
		margin-top: 1rem;
		color: var(--wa-color-text-quiet);
		font-size: 0.88rem;
		line-height: 1.65;
	}

	.pattern-card :global(wa-divider) {
		margin: 2rem 0 1.25rem;
	}

	.pattern-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.pattern-foot > span {
		color: var(--wa-color-text-quiet);
		font-size: 0.72rem;
	}

	.principles {
		display: grid;
		grid-template-columns: 0.8fr 1.2fr;
		gap: 3rem;
		border-top: 1px solid var(--wa-color-surface-border);
		padding-top: 1.5rem;
	}

	.principles h2 {
		margin-top: 0.5rem;
		font-size: clamp(1.6rem, 3vw, 2.4rem);
		letter-spacing: -0.055em;
	}

	.principle-list {
		display: grid;
		gap: 0.1rem;
	}

	.principle-list div {
		display: grid;
		grid-template-columns: minmax(11rem, 0.8fr) 1.2fr;
		gap: 1rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--wa-color-surface-border);
		font-size: 0.78rem;
	}

	.principle-list div:last-child {
		border-bottom: 0;
	}

	.principle-list span {
		color: var(--wa-color-text-quiet);
	}

	.dialog-intro {
		margin: 0;
		color: var(--wa-color-text-quiet);
		font-size: 0.85rem;
		line-height: 1.55;
	}

	.dialog-fields {
		display: grid;
		gap: 1rem;
		margin-top: 1.25rem;
	}

	.drawer-body h2 {
		margin-top: 0.7rem;
		font-size: 1.55rem;
		letter-spacing: -0.05em;
		line-height: 1.05;
	}

	.drawer-body p {
		margin-top: 0.9rem;
		color: var(--wa-color-text-quiet);
		font-size: 0.86rem;
		line-height: 1.65;
	}

	.drawer-body :global(wa-divider) {
		margin: 1.5rem 0;
	}

	.drawer-body ul {
		display: grid;
		gap: 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.drawer-body li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.82rem;
	}

	.drawer-body li span {
		display: grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		background: var(--wa-color-brand-fill-quiet);
		color: var(--wa-color-brand-on-quiet);
		font-size: 0.65rem;
		font-weight: 750;
	}

	@media (max-width: 760px) {
		.page-heading,
		.principles {
			display: grid;
			align-items: start;
		}

		.page-heading > p {
			max-width: 480px;
		}

		.pattern-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 500px) {
		.pattern-foot,
		.callout-content {
			align-items: start;
			flex-direction: column;
		}

		.pattern-foot :global(wa-button) {
			align-self: flex-start;
		}

		.principle-list div {
			grid-template-columns: 1fr;
			gap: 0.35rem;
		}
	}
</style>
