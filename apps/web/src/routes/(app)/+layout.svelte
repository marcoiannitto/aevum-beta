<script lang="ts">
	import { isLoggedIn } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { children } = $props();
	let ready = $state(false);

	onMount(() => {
		const unsub = isLoggedIn.subscribe((loggedIn) => {
			if (!loggedIn) {
				goto('/login');
			} else {
				ready = true;
			}
		});
		return unsub;
	});
</script>

{#if ready}
	{@render children()}
{:else}
	<div class="loading">
		<p>Loading...</p>
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
