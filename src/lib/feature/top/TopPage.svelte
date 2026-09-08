<script lang="ts">
	import { csvParseErrorMessage } from '$lib/csv-parse-error-message';
	import { isLargeCsvFile } from '$lib/csv-large-file';
	import { parseCsvFile } from '$lib/csv-parser';
	import NoScript from '$lib/components/NoScript.svelte';
	import Dashboard from '$lib/feature/top/Dashboard.svelte';
	import Header from '$lib/feature/top/Header.svelte';
	import * as m from '$lib/paraglide/messages';
	import { toPickerView, type ParseView } from './parse-view';
	import Footer from './Footer.svelte';
	import Picker from './Picker.svelte';
	import PrivacyNotice from './PrivacyNotice.svelte';

	let view = $state.raw<ParseView>({ status: 'idle' });
	let dashboard = $derived(view.status === 'success' ? view.dashboard : null);
	let pickerView = $derived(toPickerView(view));

	async function processFile(selected: File | undefined) {
		if (!selected || view.status === 'loading') return;

		const name = selected.name;
		const type = selected.type;
		if (!name.toLowerCase().endsWith('.csv') && type !== 'text/csv') {
			view = { status: 'error', message: m.invalid_file_type() };
			return;
		}

		if (isLargeCsvFile(selected) && !window.confirm(m.large_file_confirm())) {
			return;
		}

		view = { status: 'loading' };

		try {
			const parsing = parseCsvFile(selected, m.unknown_model());
			selected = undefined;
			view = { status: 'success', dashboard: await parsing };
		} catch (error) {
			view = { status: 'error', message: csvParseErrorMessage(error) };
		}
	}
</script>

<svelte:head>
	<title>{m.page_title()}</title>
	<meta name="description" content={m.page_description()} />
</svelte:head>

<Header />

<main class="container">
	<NoScript />

	<Picker view={pickerView} onFileSelected={processFile} />

	{#if dashboard}
		<Dashboard {dashboard} />
	{/if}

	<PrivacyNotice />
</main>

<Footer />
