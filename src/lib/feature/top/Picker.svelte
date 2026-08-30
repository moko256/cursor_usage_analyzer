<script lang="ts">
	import { browser } from '$app/environment';
	import * as m from '$lib/paraglide/messages';

	type ViewState = 'idle' | 'loading' | 'success' | 'error';

	interface Props {
		status: ViewState;
		errorMessage: string;
		pointCount: number;
		onFileSelected: (file: File | undefined) => void;
	}

	let { status, errorMessage, pointCount, onFileSelected }: Props = $props();
	let isDragging = $state(false);
	let dragDepth = $state(0);

	function openFilePicker() {
		if (browser) document.getElementById('csv-file-input')?.click();
	}

	function handleFileInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		onFileSelected(input.files?.[0]);
		input.value = '';
	}

	function handleDragEnter(event: DragEvent) {
		event.preventDefault();
		dragDepth += 1;
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
		isDragging = true;
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
		isDragging = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		dragDepth = Math.max(dragDepth - 1, 0);
		if (dragDepth === 0) isDragging = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragDepth = 0;
		isDragging = false;
		onFileSelected(event.dataTransfer?.files[0]);
	}
</script>

<svelte:window
	ondragenter={handleDragEnter}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
/>

<section class="picker" aria-labelledby="picker-description">
	<p class="picker-description">{m.csv_picker_description()}</p>

	<button type="button" onclick={openFilePicker}>{m.select_file()}</button>
	<input
		id="csv-file-input"
		class="file-input"
		type="file"
		accept=".csv,text/csv"
		aria-label={m.csv_file_input_label()}
		onchange={handleFileInput}
	/>
	{#if status === 'loading'}
		<output class="picker-status" aria-live="polite">
			<span>{m.parsing()}</span>
			<progress aria-label={m.parsing_csv()}></progress>
		</output>
	{:else if status === 'error'}
		<output class="picker-status" role="alert">
			{errorMessage}
		</output>
	{:else if status === 'success'}
		<output class="picker-status" aria-live="polite">
			{m.csv_files_loaded({ count: pointCount })}
		</output>
	{/if}
</section>

{#if isDragging}
	<aside
		class="drop-overlay"
		role="status"
		aria-live="assertive"
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
	>
		<div class="drop-message">
			<strong>{m.drop_here()}</strong>
			<p>{m.load_csv()}</p>
		</div>
	</aside>
{/if}

<style>
	.file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.drop-overlay {
		position: fixed;
		z-index: 10;
		inset: 0;
		display: grid;
		place-items: center;
		background: rgb(0 0 0 / 75%);
		color: white;
	}

	.drop-message {
		display: flex;
		align-items: center;
		flex-direction: column;
		text-align: center;
	}
</style>
