<script>
	import { m } from '$lib/paraglide/messages';
</script>

<section>
	<p class="privacy-lead">{m.privacy_notice_description_1()}</p>

	<p>
		{m.privacy_notice_description_2_example()} <code>Cloud Agent ID</code>
		<code>Automation ID</code>
		<code>User</code>
	</p>

	<p>{m.privacy_notice_description_3_offline_guide()}</p>
</section>

<style>
	.privacy-lead {
		white-space: pre-line;
	}
</style>
