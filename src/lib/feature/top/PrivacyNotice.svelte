<script>
	import { m } from '$lib/paraglide/messages';
</script>

<section>
	<p>
		{#each m.privacy_notice_description_1().split('\n') as line, index (line + index)}
			{line}<br />
		{/each}
	</p>

	<p>
		{m.privacy_notice_description_2_example()} <code>Cloud Agent ID</code>
		<code>Automation ID</code>
		<code>User</code>
	</p>

	<p>{m.privacy_notice_description_3_offline_guide()}</p>
</section>
