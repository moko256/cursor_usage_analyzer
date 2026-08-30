<script lang="ts">
	import { base, resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Pathname } from '$app/types';
	import { m } from '$lib/paraglide/messages';
</script>

<footer class="container">
	<nav>
		<ul>
			<li>
				<a href="https://github.com/moko256/cursor_usage_analyzer">{m.footer_source_link_title()}</a
				>
			</li>
			<li>
				<a
					href={resolve((page.url.pathname.slice(base.length) || '/') as Pathname)}
					download="cursor_usage_analyzer.html">{m.footer_download_link_title()}</a
				>
			</li>
		</ul>
	</nav>
</footer>
