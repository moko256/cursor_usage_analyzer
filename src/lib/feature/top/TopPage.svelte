<script lang="ts">
	import { parseCsvFile } from '$lib/csv-parser';
	import { csvParseErrorMessage } from '$lib/csv-parse-error-message';
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

	async function processFile(file: File | undefined) {
		if (!file || view.status === 'loading') return;

		if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
			view = { status: 'error', message: m.invalid_file_type() };
			return;
		}

		view = { status: 'loading' };

		try {
			view = { status: 'success', dashboard: await parseCsvFile(file, m.unknown_model()) };
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
