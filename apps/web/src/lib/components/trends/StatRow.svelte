<!--
  StatRow — stat cards with delta chips for weight/waist.
  Maps to renderTrends stat-row from index.html.
-->
<script lang="ts">
	interface Stat {
		label: string;
		value: string;
		delta?: string;
		deltaClass?: 'up' | 'down' | 'flat';
	}

	let { stats = [] }: { stats: Stat[] } = $props();
</script>

{#if stats.length}
	<div class="stat-row">
		{#each stats as s}
			<div class="stat-card">
				<span class="stat-label">{s.label}</span>
				<span class="stat-value">{s.value}</span>
				{#if s.delta}
					<span class="delta {s.deltaClass ?? ''}">{s.delta}</span>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.stat-row {
		display: flex; gap: 8px; margin-bottom: 16px;
		overflow-x: auto; -webkit-overflow-scrolling: touch;
	}
	.stat-card {
		flex: 1; min-width: 90px;
		padding: 12px;
		background: var(--card, #fff);
		border: 1px solid var(--line);
		border-radius: 12px;
		display: flex; flex-direction: column;
		align-items: center; gap: 2px;
	}
	.stat-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
	.stat-value { font-family: var(--serif); font-size: 20px; font-weight: 500; }
	.delta {
		font-size: 11px; padding: 1px 6px;
		border-radius: 6px; font-variant-numeric: tabular-nums;
	}
	.delta.down { background: #e8f5e9; color: #2d6a4f; }
	.delta.up { background: #fce4ec; color: #a13024; }
	.delta.flat { background: #f5f5f5; color: var(--muted); }
</style>
