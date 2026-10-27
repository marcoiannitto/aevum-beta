<!--
  SubTabs — pill-style sub-tab bar for Plan tab.
-->
<script lang="ts">
	type Sub = 'plan' | 'recipes' | 'fitness';
	let { active = 'plan' as Sub, onSwitch }: { active: Sub; onSwitch: (s: Sub) => void } = $props();
	const tabs: { key: Sub; label: string }[] = [
		{ key: 'plan', label: 'Meals' },
		{ key: 'recipes', label: 'Recipes' },
		{ key: 'fitness', label: 'Move' }
	];
</script>

<div class="sub-tabs">
	{#each tabs as t}
		<button class="sub-tab" class:on={active === t.key} onclick={() => onSwitch(t.key)}>{t.label}</button>
	{/each}
</div>

<style>
	.sub-tabs {
		display: flex; gap: 6px;
		background: var(--line-soft, #f0ede8);
		border-radius: 12px; padding: 4px;
		margin-bottom: 16px;
	}
	.sub-tab {
		flex: 1; padding: 11px;
		border-radius: 9px; font-size: 14px;
		font-weight: 600; color: var(--muted);
		background: transparent; border: none;
		cursor: pointer; font-family: inherit;
	}
	.sub-tab.on {
		background: var(--card, #fff);
		color: var(--ink);
		box-shadow: 0 1px 3px rgba(0,0,0,.06);
	}
</style>
