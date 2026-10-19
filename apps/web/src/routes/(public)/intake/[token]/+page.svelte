<script lang="ts">
	import { page } from '$app/state';

	// Token from URL: /intake/abc123
	const token = $derived(page.params.token);
	// TODO: Migrate intake.html form logic
</script>

<svelte:head>
	<title>AEVUM Intake</title>
</svelte:head>

<main class="intake">
	<header class="intake-bar">
		<span class="mark">AEVUM</span>
		<span class="badge">Intake Form</span>
	</header>

	<div class="content">
		<p class="placeholder">Intake form migration in progress. Token: {token}</p>
	</div>
</main>

<style>
	.intake {
		min-height: 100vh;
		background: var(--ink);
		color: #fff;
	}
	.intake-bar {
		padding: calc(env(safe-area-inset-top) + 16px) 18px 16px;
		display: flex;
		align-items: baseline;
		gap: 12px;
	}
	.mark {
		font-family: var(--serif);
		font-size: 17px;
		letter-spacing: 0.18em;
	}
	.badge {
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--gold);
		font-weight: 600;
	}
	.content {
		padding: 24px 18px;
	}
	.placeholder {
		text-align: center;
		color: #938c7d;
		font-size: 14px;
		padding: 60px 20px;
		border: 1px dashed #34322d;
		border-radius: 16px;
	}
</style>
