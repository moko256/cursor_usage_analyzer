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

<section aria-labelledby="picker-description">
	<p id="picker-description">{m.csv_picker_description()}</p>

	<button type="button" onclick={openFilePicker}>{m.select_file()}</button>
	<input
		{@attach attachFileInput}
		class="file-input"
		type="file"
		accept=".csv,text/csv"
		aria-label={m.csv_file_input_label()}
		onchange={handleFileInput}
	/>
	{#if view.status !== 'idle'}
		<output
			aria-live={view.status === 'error' ? 'assertive' : 'polite'}
			role={view.status === 'error' ? 'alert' : undefined}
		>
			{#if view.status === 'loading'}
				<span>{m.parsing()}</span>
				<progress aria-label={m.parsing_csv()}></progress>
			{:else if view.status === 'error'}
				{view.message}
			{:else}
				{m.csv_files_loaded({ count: view.pointCount })}
			{/if}
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
		text-align: center;
	}
</style>
