<!--
  PhaseStrip — colored phase segments across total program days.
  Maps to trendsPhaseStrip() from index.html.
-->
<script lang="ts">
	import { get } from 'svelte/store';
	import { phasesList, phaseLens, totalDays, phaseFor, phReg } from '$lib/stores/phases';
	import { profile } from '$lib/stores/auth';
	import { pid, K } from '$lib/stores/auth';

	const lens = $derived(phaseLens($profile));
	const programDays = $derived(totalDays($profile));

	/** Scan localStorage for highest day with data */
	function highestDataDay(): number {
		if (typeof window === 'undefined') return 0;
		const id = get(pid);
		if (!id) return 0;
		let max = 0;
		const prefix = `aevum_${id}_day_`;
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith(prefix)) {
				const num = parseInt(key.slice(prefix.length), 10);
				if (!isNaN(num) && num > max) max = num;
			}
		}
		return max;
	}

	const total = $derived(Math.max(programDays, highestDataDay()) || 1);

	const segments = $derived.by(() => {
		if (!$phasesList.length || total === 0) return [];
		const segs = $phasesList
			.filter(ph => lens[ph.key] > 0)
			.map(ph => ({
				key: ph.key,
				name: ph.name,
				color: ph.color,
				pct: ((lens[ph.key] ?? 0) / total) * 100
			}));

		// Add post-program segment if user has data beyond program phases
		const programTotal = programDays;
		if (programTotal < total) {
			const currentPh = phaseFor(programTotal + 1, $profile);
			const reg = phReg(currentPh.key);
			segs.push({
				key: currentPh.key,
				name: reg?.name ?? currentPh.name,
				color: reg?.color ?? currentPh.color,
				pct: ((total - programTotal) / total) * 100
			});
		}

		return segs;
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
