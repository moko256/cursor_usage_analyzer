<script lang="ts">
	import '@awesome.me/webawesome/dist/components/button/button.js';
	import '@awesome.me/webawesome/dist/components/callout/callout.js';
	import '@awesome.me/webawesome/dist/components/card/card.js';
	import '@awesome.me/webawesome/dist/components/checkbox/checkbox.js';
	import '@awesome.me/webawesome/dist/components/divider/divider.js';
	import '@awesome.me/webawesome/dist/components/input/input.js';
	import '@awesome.me/webawesome/dist/components/option/option.js';
	import '@awesome.me/webawesome/dist/components/progress-bar/progress-bar.js';
	import '@awesome.me/webawesome/dist/components/select/select.js';
	import '@awesome.me/webawesome/dist/components/slider/slider.js';
	import '@awesome.me/webawesome/dist/components/switch/switch.js';
	import '@awesome.me/webawesome/dist/components/textarea/textarea.js';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';

	let formState = $state({
		name: '',
		email: '',
		team: 'product',
		message: '',
		updates: true,
		digest: false,
		density: 64
	});
	let submitState = $state<'idle' | 'submitted'>('idle');
	let completion = $derived(
		Math.round(
			([formState.name, formState.email, formState.team, formState.message].filter(Boolean).length /
				4) *
				100
		)
	);
	let responseLabel = $derived(
		submitState === 'submitted'
			? `Thanks, ${formState.name || 'there'} — your preferences are saved.`
			: 'Your response will appear here after you submit.'
	);

	function updateText(field: 'name' | 'email' | 'message', event: Event) {
		formState[field] = (event.currentTarget as HTMLInputElement).value;
		submitState = 'idle';
	}

	function updateTeam(event: Event) {
		formState.team = (event.currentTarget as HTMLSelectElement).value;
		submitState = 'idle';
	}

	function updateBoolean(field: 'updates' | 'digest', event: Event) {
		formState[field] = (event.currentTarget as HTMLInputElement).checked;
		submitState = 'idle';
	}

	function updateDensity(event: Event) {
		formState.density = Number((event.currentTarget as HTMLInputElement).value);
		submitState = 'idle';
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		submitState = 'submitted';
	}
</script>

<svelte:head>
	<title>Web Awesome Studio · Forms</title>
	<meta
		name="description"
		content="Explore Web Awesome form controls with reactive Svelte 5 state and live feedback."
	/>
</svelte:head>

<div class="page">
	<section class="page-heading" aria-labelledby="forms-title">
		<div>
			<a class="back-link" href={resolve(localizeHref('/') as Pathname)}>← Back to overview</a>
			<div class="eyebrow">Demo 01 · Forms</div>
			<h1 id="forms-title">Make the next step feel easy.</h1>
		</div>
		<p>Native form semantics, expressive controls, and state that stays visible while you work.</p>
	</section>

	<div class="content-grid">
		<wa-card class="form-card">
			<div class="card-heading">
				<div>
					<span class="card-kicker">Preference profile</span>
					<h2>Tell us a little about you</h2>
				</div>
				<span class="completion">{completion}%</span>
			</div>
			<wa-progress-bar value={completion} label={`Form completion: ${completion}%`}
			></wa-progress-bar>
			<wa-divider></wa-divider>

			<form onsubmit={handleSubmit}>
				<div class="field-grid">
					<wa-input
						label="Full name"
						name="name"
						placeholder="Avery Morgan"
						required
						value={formState.name}
						oninput={(event: Event) => updateText('name', event)}
					></wa-input>
					<wa-input
						label="Email address"
						name="email"
						type="email"
						placeholder="avery@example.com"
						required
						value={formState.email}
						oninput={(event: Event) => updateText('email', event)}
					></wa-input>
					<wa-select
						label="Primary team"
						name="team"
						hint="We'll tailor examples to your workflow."
						value={formState.team}
						onchange={updateTeam}
					>
						<wa-option value="product">Product design</wa-option>
						<wa-option value="engineering">Engineering</wa-option>
						<wa-option value="marketing">Marketing</wa-option>
						<wa-option value="founder">Founder / solo</wa-option>
					</wa-select>
					<wa-textarea
						class="wide"
						label="What are you building?"
						name="message"
						placeholder="A dashboard for a calm, productive team…"
						resize="auto"
						value={formState.message}
						oninput={(event: Event) => updateText('message', event)}
					></wa-textarea>
				</div>

				<div class="settings">
					<div>
						<span class="card-kicker">Stay in the loop</span>
						<h3>Thoughtful defaults, always adjustable.</h3>
					</div>
					<div class="toggle-list">
						<wa-checkbox
							checked
							name="updates"
							onchange={(event: Event) => updateBoolean('updates', event)}
						>
							Product updates
						</wa-checkbox>
						<wa-switch name="digest" onchange={(event: Event) => updateBoolean('digest', event)}>
							Weekly design digest
						</wa-switch>
					</div>
				</div>

				<wa-divider></wa-divider>

				<div class="range-row">
					<div>
						<span class="card-kicker">Interface density</span>
						<p>Adjust the amount of breathing room in your workspace.</p>
					</div>
					<div class="range-control">
						<strong>{formState.density}%</strong>
						<wa-slider
							label="Interface density"
							min="0"
							max="100"
							value={formState.density}
							oninput={updateDensity}
						></wa-slider>
					</div>
				</div>

				<div class="form-actions">
					<span class="muted">All fields marked required are needed.</span>
					<wa-button variant="brand" type="submit">Save preferences</wa-button>
				</div>
			</form>
		</wa-card>

		<aside class="side-column" aria-label="Live form preview">
			<wa-callout variant={submitState === 'submitted' ? 'success' : 'brand'} open>
				<strong>{responseLabel}</strong>
				<p>
					{submitState === 'submitted'
						? 'This is local demo state — no data leaves your browser.'
						: 'Fill out the profile to see the response change.'}
				</p>
			</wa-callout>

			<wa-card class="preview-card">
				<span class="card-kicker">Live preview</span>
				<h2>{formState.name || 'Your profile'}</h2>
				<p>{formState.email || 'email@example.com'}</p>
				<wa-divider></wa-divider>
				<div class="preview-list">
					<div><span>Team</span><strong>{formState.team}</strong></div>
					<div><span>Product updates</span><strong>{formState.updates ? 'On' : 'Off'}</strong></div>
					<div><span>Weekly digest</span><strong>{formState.digest ? 'On' : 'Off'}</strong></div>
				</div>
			</wa-card>

			<a class="next-link" href={resolve(localizeHref('/feedback') as Pathname)}>
				<span><small>Next demo</small><strong>Feedback patterns</strong></span>
				<span aria-hidden="true">↗</span>
			</a>
		</aside>
	</div>
</div>

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
	.card-kicker {
		color: var(--wa-color-brand-on-quiet);
		font-size: 0.7rem;
		font-weight: 750;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.page-heading h1 {
		max-width: 650px;
		margin: 0.55rem 0 0;
		font-size: clamp(2.5rem, 6vw, 5.2rem);
		letter-spacing: -0.07em;
		line-height: 0.96;
	}

	.content-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 300px;
		align-items: start;
		gap: 1rem;
	}

	.form-card {
		--padding: clamp(1.25rem, 4vw, 2.5rem);
	}

	.card-heading {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 1rem;
	}

	.card-heading h2 {
		margin-top: 0.45rem;
		font-size: 1.4rem;
		letter-spacing: -0.04em;
	}

	.completion {
		color: var(--wa-color-brand-on-quiet);
		font-size: 1.5rem;
		font-weight: 760;
		letter-spacing: -0.05em;
	}

	.form-card :global(wa-progress-bar) {
		margin-top: 1.5rem;
	}

	.form-card :global(wa-divider),
	.preview-card :global(wa-divider) {
		margin: 1.5rem 0;
	}

	.field-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
	}

	.field-grid :global(wa-input),
	.field-grid :global(wa-select),
	.field-grid :global(wa-textarea) {
		width: 100%;
	}

	.field-grid :global(wa-textarea.wide) {
		grid-column: 1 / -1;
	}

	.settings {
		display: flex;
		justify-content: space-between;
		gap: 2rem;
		margin-top: 2rem;
	}

	.settings h3 {
		max-width: 240px;
		margin-top: 0.5rem;
		font-size: 1rem;
		letter-spacing: -0.02em;
		line-height: 1.35;
	}

	.toggle-list {
		display: grid;
		gap: 0.9rem;
		padding-top: 0.1rem;
	}

	.range-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
	}

	.range-row p {
		margin-top: 0.5rem;
		color: var(--wa-color-text-quiet);
		font-size: 0.8rem;
	}

	.range-control {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		min-width: 220px;
	}

	.range-control strong {
		min-width: 2.5rem;
		color: var(--wa-color-brand-on-quiet);
		text-align: right;
	}

	.range-control :global(wa-slider) {
		flex: 1;
	}

	.form-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.muted,
	.preview-card p {
		color: var(--wa-color-text-quiet);
		font-size: 0.75rem;
	}

	.side-column {
		display: grid;
		gap: 1rem;
	}

	.side-column :global(wa-callout) {
		--border-radius: var(--wa-border-radius-m);
	}

	.side-column :global(wa-callout p) {
		margin: 0.45rem 0 0;
		font-size: 0.8rem;
		line-height: 1.5;
	}

	.preview-card {
		--padding: 1.5rem;
	}

	.preview-card h2 {
		margin-top: 0.7rem;
		font-size: 1.35rem;
		letter-spacing: -0.04em;
	}

	.preview-card p {
		margin-top: 0.3rem;
	}

	.preview-list {
		display: grid;
		gap: 0.8rem;
	}

	.preview-list div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		font-size: 0.78rem;
	}

	.preview-list span {
		color: var(--wa-color-text-quiet);
	}

	.preview-list strong {
		color: var(--wa-color-text-normal);
		font-weight: 650;
		text-transform: capitalize;
	}

	.next-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 0;
		border-top: 1px solid var(--wa-color-surface-border);
		border-bottom: 1px solid var(--wa-color-surface-border);
		text-decoration: none;
	}

	.next-link small,
	.next-link strong {
		display: block;
	}

	.next-link small {
		margin-bottom: 0.3rem;
		color: var(--wa-color-text-quiet);
		font-size: 0.67rem;
		text-transform: uppercase;
	}

	.next-link strong {
		font-size: 0.9rem;
	}

	.next-link > span:last-child {
		color: var(--wa-color-brand-on-quiet);
		font-size: 1.3rem;
	}

	@media (max-width: 860px) {
		.page-heading {
			display: grid;
			align-items: start;
		}

		.page-heading > p {
			max-width: 480px;
		}

		.content-grid {
			grid-template-columns: 1fr;
		}

		.side-column {
			grid-template-columns: 1fr 1fr;
		}

		.side-column :global(wa-callout),
		.next-link {
			grid-column: 1 / -1;
		}
	}

	@media (max-width: 600px) {
		.field-grid,
		.side-column {
			grid-template-columns: 1fr;
		}

		.field-grid :global(wa-textarea.wide) {
			grid-column: auto;
		}

		.settings,
		.range-row,
		.form-actions {
			display: grid;
			gap: 1rem;
		}

		.range-control {
			min-width: 0;
		}

		.form-actions :global(wa-button) {
			justify-self: start;
		}
	}
</style>
