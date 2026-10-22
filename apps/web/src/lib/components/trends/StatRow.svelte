<!--
  StatRow — single hero card with contextual chips, matching V2 stat pattern.
  Receives stats[] array: "Current" becomes the hero, rest become chips.
  v1.14.0 — #41 rebuild to V2 single-card layout
-->
<script lang="ts">
	interface Stat {
		label: string;
		value: string;
		delta?: string;
		deltaClass?: 'up' | 'down' | 'flat';
	}

	let { stats = [] }: { stats: Stat[] } = $props();

	// Hero = "Current" stat (or second item, or first as fallback)
	const hero = $derived(stats.find(s => s.label === 'Current') ?? stats[1] ?? stats[0]);
	// Chips = everything except the hero
	const chips = $derived(stats.filter(s => s !== hero));
</script>

{#if stats.length}
	<div class="stat-card">
		{#if hero}
			<div class="hero-label">{hero.label}</div>
			<div class="hero-value">{hero.value}</div>
		{/if}

		{#if chips.length}
			<div class="chips">
				{#each chips as s}
					{#if s.delta}
						<span class="chip {s.deltaClass ?? ''}">{s.delta}</span>
					{:else}
						<span class="chip">{s.label}: {s.value}</span>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	.stat-card {
		margin-bottom: 10px;
	}
	.hero-label {
		font-size: 12px;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.hero-value {
		font-family: var(--serif);
		font-size: 26px;
		font-weight: 500;
		margin-top: 4px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 8px;
	}
	.chip {
		font-size: 11px;
		font-weight: 600;
		padding: 2px 7px;
		border-radius: 8px;
		background: var(--line-soft, #f5f5f5);
		color: var(--ink-soft, #555);
		font-variant-numeric: tabular-nums;
	}
	.chip.down { background: #eef4ec; color: #3f7a4a; }
	.chip.up { background: var(--over-bg, #fce4ec); color: var(--over, #a13024); }
	.chip.flat { background: #f5f5f5; color: var(--muted); }
</style>
