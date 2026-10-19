<!--
  BottomNav — 4-tab navigation bar at bottom of screen.
  Maps to .nav #nav from index.html.
-->
<script lang="ts">
	type Tab = 'today' | 'daily' | 'trends' | 'nutrition';

	interface Props {
		active: Tab;
		onSwitch: (tab: Tab) => void;
	}

	let { active, onSwitch }: Props = $props();

	const tabs: { key: Tab; label: string; icon: string }[] = [
		{
			key: 'today',
			label: 'Today',
			icon: '<path d="M4 11l8-6 8 6"/><path d="M6 10v9h12v-9"/>',
		},
		{
			key: 'daily',
			label: 'Check-in',
			icon: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4"/>',
		},
		{
			key: 'trends',
			label: 'Trends',
			icon: '<path d="M4 19V5M4 19h16"/><path d="M7 15l4-5 3 3 4-6"/>',
		},
		{
			key: 'nutrition',
			label: 'Plan',
			icon: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 10h6M9 14h6M9 18h4"/>',
		},
	];
</script>

<nav class="nav">
	{#each tabs as tab (tab.key)}
		<button
			class:on={active === tab.key}
			onclick={() => onSwitch(tab.key)}
			aria-label={tab.label}
		>
			<span class="ic">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
					{@html tab.icon}
				</svg>
			</span>
			{tab.label}
		</button>
	{/each}
</nav>

<style>
	.nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 30;
		display: flex;
		justify-content: space-around;
		background: rgba(251, 250, 247, 0.95);
		backdrop-filter: saturate(180%) blur(12px);
		-webkit-backdrop-filter: saturate(180%) blur(12px);
		border-top: 1px solid var(--line);
		padding: 6px 0 calc(env(safe-area-inset-bottom) + 6px);
		height: var(--nav-h);
	}
	button {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		font-size: 10px;
		color: var(--muted);
		letter-spacing: 0.03em;
		padding: 4px 12px;
		-webkit-tap-highlight-color: transparent;
		transition: color 0.15s;
	}
	button.on {
		color: var(--ink);
	}
	.ic {
		display: flex;
	}
</style>
