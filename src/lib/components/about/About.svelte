<script lang="ts">
	import * as m from '$lib/paraglide/messages';
</script>

<section class="overview" aria-labelledby="overview-title">
	<h2 id="overview-title">{m.overview_heading()}</h2>
	<p>{m.overview_description()}</p>
</section>

<style>
	.overview {
		flex: 0 0 auto;
		padding: 15px 18px;
		border: 1px solid #e2e0d9;
		border-radius: 12px;
		background: rgba(255, 254, 250, 0.72);
	}

	.overview h2 {
		margin: 0 0 4px;
		font-size: 13px;
		letter-spacing: -0.02em;
	}

	.overview p {
		margin: 0;
		color: #8b9490;
		font-size: 11px;
		line-height: 1.5;
	}
</style>
