<script lang="ts">
	import { auth, isLoggedIn } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { children } = $props();
	let ready = $state(false);

	onMount(() => {
		// Redirect to login if not authenticated
		const unsub = isLoggedIn.subscribe((loggedIn) => {
			if (!loggedIn) {
				// TODO: Replace with login route once built
				ready = false;
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
	<!-- Login screen will be rendered here -->
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
