<script lang="ts">
	import { token } from '$lib/stores/auth';
	import { onMount } from 'svelte';

	let { children } = $props();
	let ready = $state(false);

	onMount(() => {
		// Admin uses sessionStorage token, separate from app auth
		const adminToken = sessionStorage.getItem('aevum_admin_token');
		if (adminToken) {
			ready = true;
		}
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
