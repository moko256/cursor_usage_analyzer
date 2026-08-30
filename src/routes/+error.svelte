<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
</script>

<main class="container">
	<h1>{page.status} {page.error?.message}</h1>
	<a href={resolve('/')}>Back to TOP</a>
</main>
