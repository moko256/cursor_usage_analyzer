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

<article
	class:compact={status === 'success'}
	class:initial={status !== 'success'}
	class="picker-card"
>
	<section class="picker" aria-labelledby="picker-title">
		<div class="picker-copy">
			<h2 id="picker-title">{m.csv_picker_title()}</h2>
			<p>{m.csv_picker_description()}</p>
		</div>
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
</article>

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
			<span>{m.load_csv()}</span>
		</div>
	</aside>
{/if}

<style>
	.picker-card {
		min-width: 0;
	}

	.picker-card.initial {
		min-height: 180px;
	}

	.picker {
		min-width: 0;
	}

	.picker-card.initial .picker {
		display: grid;
		place-content: center;
		min-height: inherit;
	}

	.picker-copy {
		min-width: 0;
	}

	.file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.picker-status {
		display: block;
	}

	.picker-status progress {
		display: block;
		width: 100%;
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
		gap: 0.5rem;
		text-align: center;
	}

	.drop-message strong {
		font-size: 1.25rem;
	}

	.drop-message span {
		font-size: 0.875rem;
	}
</style>
