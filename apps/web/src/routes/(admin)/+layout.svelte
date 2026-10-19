<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { onMount } from 'svelte';

	let { children } = $props();
	let ready = $state(false);

	onMount(() => {
		// TODO: check admin role from profile
		const unsub = auth.token.subscribe((t) => {
			ready = !!t;
		});
		return unsub;
	});
</script>

{#if ready}
	{@render children()}
{:else}
	<div class="loading">
		<p>Admin access required</p>
	</div>
{/if}

<style>
	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100vh;
		font-family: var(--serif);
		color: var(--muted);
	}
</style>
