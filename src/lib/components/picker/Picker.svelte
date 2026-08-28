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

	function handlePickerKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openFilePicker();
		}
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

<wa-card
	class:compact={status === 'success'}
	class:initial={status !== 'success'}
	class="picker-card"
>
	<div class="picker">
		<div class="picker-icon" aria-hidden="true"><wa-icon name="cloud-arrow-up"></wa-icon></div>
		<div>
			<h2>{m.csv_picker_title()}</h2>
			<p>{m.csv_picker_description()}</p>
		</div>
		<wa-button
			variant="brand"
			size="m"
			type="button"
			role="button"
			tabindex="0"
			onclick={openFilePicker}
			onkeydown={handlePickerKeydown}
		>
			<wa-icon slot="start" name="folder-open"></wa-icon>
			{m.select_file()}
		</wa-button>
		<input
			id="csv-file-input"
			class="file-input"
			type="file"
			accept=".csv,text/csv"
			aria-label={m.csv_file_input_label()}
			onchange={handleFileInput}
		/>
		{#if status === 'loading'}
			<div class="picker-status" role="status">
				<span>{m.parsing()}</span>
				<wa-progress-bar indeterminate label={m.parsing_csv()}></wa-progress-bar>
			</div>
		{:else if status === 'error'}
			<wa-callout variant="danger" appearance="outlined" class="picker-status">
				<wa-icon slot="icon" name="triangle-exclamation"></wa-icon>
				{errorMessage}
			</wa-callout>
		{:else if status === 'success'}
			<wa-callout variant="success" appearance="outlined" class="picker-status">
				<wa-icon slot="icon" name="circle-check"></wa-icon>
				{m.csv_files_loaded({ count: pointCount })}
			</wa-callout>
		{/if}
	</div>
</wa-card>

{#if isDragging}
	<div
		class="drop-overlay"
		role="status"
		aria-live="assertive"
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
	>
		<div class="drop-message">
			<wa-icon name="cloud-arrow-up" aria-hidden="true"></wa-icon>
			<strong>{m.drop_here()}</strong>
			<span>{m.load_csv()}</span>
		</div>
	</div>
{/if}

<style>
	.picker-card {
		min-width: 0;
		flex: 0 0 auto;
		background: #fffefa;
	}

	.picker-card.initial {
		flex: 1 1 auto;
	}

	.picker {
		display: flex;
		min-width: 0;
		flex-wrap: wrap;
		align-items: center;
		gap: 13px;
		padding: clamp(18px, 3vw, 28px);
	}

	.picker-card.initial .picker {
		align-content: center;
		justify-content: center;
		min-height: 180px;
	}

	.picker-icon {
		display: grid;
		width: 40px;
		height: 40px;
		flex: 0 0 auto;
		place-items: center;
		border-radius: 10px;
		background: #f9dfd3;
		color: #c65f40;
		font-size: 19px;
	}

	.picker h2 {
		margin: 0 0 3px;
		font-size: 16px;
		letter-spacing: -0.03em;
	}

	.picker p {
		margin: 0;
		color: #88918e;
		font-size: 11px;
	}

	.picker :global(wa-button) {
		margin-left: auto;
	}

	.picker-card.initial .picker :global(wa-button) {
		margin-left: 0;
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
		flex: 1 0 100%;
		margin-top: 2px;
	}

	.picker-status :global(wa-progress-bar) {
		display: block;
		margin-top: 7px;
	}

	.picker-status :global(p) {
		font-size: 11px;
	}

	.drop-overlay {
		position: fixed;
		z-index: 10;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 18px;
		background: rgba(38, 54, 58, 0.87);
		backdrop-filter: blur(4px);
	}

	.drop-message {
		display: flex;
		align-items: center;
		flex-direction: column;
		width: min(500px, 100%);
		padding: 64px 24px;
		border: 2px dashed #f2ad91;
		border-radius: 16px;
		color: #fff8f2;
		text-align: center;
	}

	.drop-message :global(wa-icon) {
		margin-bottom: 14px;
		color: #f2ad91;
		font-size: 30px;
	}

	.drop-message strong {
		font-size: 21px;
		letter-spacing: -0.04em;
	}

	.drop-message span {
		margin-top: 6px;
		color: #c7d1ce;
		font-size: 11px;
	}

	@media (max-width: 460px) {
		.picker {
			align-items: flex-start;
		}

		.picker :global(wa-button) {
			margin-left: 53px;
		}

		.picker-card.initial .picker :global(wa-button) {
			margin-left: 0;
		}
	}
</style>
