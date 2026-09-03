<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { PickerView } from './parse-view';

	interface Props {
		view: PickerView;
		onFileSelected: (file: File | undefined) => void;
	}

	let { view, onFileSelected }: Props = $props();
	let fileInput: HTMLInputElement | undefined;
	let dragDepth = $state(0);
	let isDragging = $derived(dragDepth > 0);

	function attachFileInput(node: HTMLInputElement) {
		fileInput = node;
		return () => {
			fileInput = undefined;
		};
	}

	function openFilePicker() {
		fileInput?.click();
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
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		dragDepth = Math.max(dragDepth - 1, 0);
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragDepth = 0;
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
		{@attach attachFileInput}
		class="file-input"
		type="file"
		accept=".csv,text/csv"
		aria-label={m.csv_file_input_label()}
		onchange={handleFileInput}
	/>
	{#if view.status === 'loading'}
		<output class="picker-status" aria-live="polite">
			<span>{m.parsing()}</span>
			<progress aria-label={m.parsing_csv()}></progress>
		</output>
	{:else if view.status === 'error'}
		<output class="picker-status" role="alert">
			{view.message}
		</output>
	{:else if view.status === 'success'}
		<output class="picker-status" aria-live="polite">
			{m.csv_files_loaded({ count: view.pointCount })}
		</output>
	{/if}
</section>

{#if isDragging}
	<aside class="drop-overlay" role="status" aria-live="assertive">
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
		pointer-events: none;
	}

	.drop-message {
		display: flex;
		align-items: center;
		flex-direction: column;
		text-align: center;
	}
</style>
