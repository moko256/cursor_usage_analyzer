<script>
	import { m } from '$lib/paraglide/messages';
	import { currentPageAbsoluteUrl } from '$lib/site-url-resolver';
</script>

<footer class="container">
	<nav>
		<ul>
			<li>
				<a href="https://github.com/moko256/cursor_usage_analyzer">{m.footer_source_link_title()}</a
				>
			</li>
			<li>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={currentPageAbsoluteUrl().toString()} download="cursor_usage_analyzer.html"
					>{m.footer_download_link_title()}</a
				>
			</li>
		</ul>
	</nav>
</footer>
