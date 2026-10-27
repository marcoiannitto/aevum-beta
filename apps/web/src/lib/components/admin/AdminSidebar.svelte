<script lang="ts">
	import { SIDEBAR_SECTIONS, dataStore, adminLogout } from '$lib/stores/admin';

	let { activeTable, onSelect }: {
		activeTable: string;
		onSelect: (key: string) => void;
	} = $props();

	function handleLogout() {
		adminLogout();
		window.location.href = '/admin';
	}

	function rowCount(key: string): string {
		const d = $dataStore[key];
		if (!d) return '';
		return String(d.current.length);
	}

	function isDirty(key: string): boolean {
		const d = $dataStore[key];
		return d?.dirty ?? false;
	}
</script>

<nav class="sidebar">
	<div class="sb-brand">
		<div class="mark">AEVUM</div>
		<div class="sub">ADMIN</div>
	</div>

	{#each SIDEBAR_SECTIONS as section}
		<div class="sb-section">{section.title}</div>
		{#each section.items as item}
			<button
				class="sb-item"
				class:active={activeTable === item.key}
				class:dirty={isDirty(item.key)}
				onclick={() => onSelect(item.key)}
			>
				{item.label}
				<span class="dot"></span>
				<span class="sb-count">{rowCount(item.key)}</span>
			</button>
		{/each}
	{/each}

	<div class="sb-bottom">
		<button class="sb-logout" onclick={handleLogout}>Sign out</button>
	</div>
</nav>

<style>
	.sidebar {
		width: 220px;
		background: #141311;
		color: #b7b1a4;
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		overflow-y: auto;
		height: 100vh;
		position: sticky;
		top: 0;
	}
	.sb-brand {
		padding: 22px 20px 18px;
		border-bottom: 1px solid #2a2820;
	}
	.mark {
		font-family: var(--serif);
		font-size: 16px;
		color: #fff;
		letter-spacing: 0.14em;
	}
	.sub {
		font-size: 10px;
		color: var(--gold);
		letter-spacing: 0.2em;
		margin-top: 3px;
	}
	.sb-section {
		padding: 16px 0 8px 20px;
		font-size: 10px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #6b665c;
	}
	.sb-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 20px;
		font-size: 13px;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
		position: relative;
		width: 100%;
		text-align: left;
		border: none;
		background: none;
		color: #b7b1a4;
	}
	.sb-item:hover {
		background: #1e1d1a;
		color: #e9e5dc;
	}
	.sb-item.active {
		background: #2a2820;
		color: var(--gold);
		font-weight: 600;
	}
	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--gold);
		display: none;
		position: absolute;
		right: 16px;
	}
	.sb-item.dirty .dot {
		display: block;
	}
	.sb-count {
		font-size: 11px;
		color: #6b665c;
		margin-left: auto;
	}
	.sb-bottom {
		margin-top: auto;
		padding: 16px 20px;
		border-top: 1px solid #2a2820;
	}
	.sb-logout {
		font-size: 12px;
		color: #6b665c;
		cursor: pointer;
		background: none;
		border: none;
		transition: color 0.15s;
	}
	.sb-logout:hover {
		color: var(--gold);
	}

	@media (max-width: 900px) {
		.sidebar { width: 180px; }
	}
	@media (max-width: 600px) {
		.sidebar { display: none; }
	}
</style>
