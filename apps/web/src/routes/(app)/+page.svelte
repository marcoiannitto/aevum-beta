<script lang="ts">
	// Main tracker page (replaces index.html)
	// TODO: Migrate tabs - Today, Check-in, Trends, Plan
</script>

<svelte:head>
	<title>AEVUM</title>
</svelte:head>

<main class="tracker">
	<header class="topbar">
		<div class="line1">
			<span class="mark">AEVUM</span>
			<span class="who">Profile</span>
		</div>
	</header>

	<div class="content">
		<p class="placeholder">Tracker migration in progress. Tabs: Today, Check-in, Trends, Plan.</p>
	</div>
</main>

<style>
	.tracker {
		min-height: 100vh;
	}
	.topbar {
		position: sticky;
		top: 0;
		z-index: 20;
		background: rgba(251, 250, 247, 0.92);
		backdrop-filter: saturate(180%) blur(12px);
		-webkit-backdrop-filter: saturate(180%) blur(12px);
		border-bottom: 1px solid var(--line);
		padding: calc(env(safe-area-inset-top) + 10px) 18px 12px;
	}
	.line1 {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}
	.mark {
		font-family: var(--serif);
		font-size: 17px;
		letter-spacing: 0.18em;
	}
	.who {
		font-size: 13px;
		color: var(--muted);
		cursor: pointer;
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
