<script lang="ts">
	// Admin dashboard (replaces admin.html)
	// TODO: Migrate user management, meal plans, intake, scans, phase lengths
</script>

<svelte:head>
	<title>AEVUM Admin</title>
</svelte:head>

<main class="admin">
	<header class="admin-bar">
		<span class="mark">AEVUM</span>
		<span class="badge">Admin</span>
	</header>

	<div class="content">
		<p class="placeholder">Admin panel migration in progress.</p>
	</div>
</main>

<style>
	.admin {
		min-height: 100vh;
		background: var(--paper);
	}
	.admin-bar {
		position: sticky;
		top: 0;
		z-index: 20;
		background: var(--ink);
		color: #fff;
		padding: calc(env(safe-area-inset-top) + 12px) 18px 12px;
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
		color: var(--muted);
		font-size: 14px;
		padding: 60px 20px;
		border: 1px dashed var(--line);
		border-radius: 16px;
	}
</style>
