<!--
  PhaseStrip — colored phase segments across total program days.
  Maps to trendsPhaseStrip() from index.html.
-->
<script lang="ts">
	import { phasesList, phaseLens, totalDays } from '$lib/stores/phases';
	import { profile } from '$lib/stores/auth';

	const lens = $derived(phaseLens($profile));
	const total = $derived(totalDays($profile));

	const segments = $derived.by(() => {
		if (!$phasesList.length || total === 0) return [];
		return $phasesList
			.filter(ph => lens[ph.key] > 0)
			.map(ph => ({
				key: ph.key,
				name: ph.name,
				color: ph.color,
				pct: ((lens[ph.key] ?? 0) / total) * 100
			}));
	});
</script>

{#if segments.length > 1}
	<div class="strip">
		{#each segments as seg}
			<div
				class="seg"
				style="width:{seg.pct}%; background:{seg.color}"
				title="{seg.name} ({Math.round(seg.pct)}%)"
			></div>
		{/each}
	</div>
	<div class="labels">
		{#each segments as seg}
			<span class="sl" style="color:{seg.color}">{seg.name}</span>
		{/each}
	</div>
{/if}

<style>
	.strip {
		display: flex; height: 6px; border-radius: 3px; overflow: hidden;
		margin-bottom: 4px;
	}
	.seg { min-width: 4px; }
	.labels {
		display: flex; gap: 8px; flex-wrap: wrap;
		margin-bottom: 14px;
	}
	.sl { font-size: 10px; font-weight: 500; }
</style>
