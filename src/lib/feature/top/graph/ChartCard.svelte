<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		subtitle: string;
		children: Snippet;
		class?: string;
	}

	let { title, subtitle, children, class: className = '' }: Props = $props();
</script>

<article class={['chart-card', className]}>
	<figure>
		<figcaption>
			<strong>{title}</strong>
			<span>{subtitle}</span>
		</figcaption>
		{@render children()}
	</figure>
</article>
