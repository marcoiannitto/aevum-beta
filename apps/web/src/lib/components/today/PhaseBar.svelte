<script lang="ts">
	import { profile, isProgram } from '$lib/stores/auth';
	import { currentDay } from '$lib/stores/day';
	import { phaseFor, phasesList, totalDays } from '$lib/stores/phases';

	interface PhaseRun {
		key: string;
		name: string;
		color: string;
		lo: number;
		hi: number;
	}

	const maxD = $derived(Math.max(totalDays($profile), $currentDay));

	const runs = $derived.by(() => {
		const list: PhaseRun[] = [];
		let prev: PhaseRun | null = null;
		for (let d = 1; d <= maxD; d++) {
			const pf = phaseFor(d, $profile);
			if (prev && prev.key === pf.key) {
				prev.hi = d;
			} else {
				prev = { key: pf.key, name: pf.name, color: pf.color, lo: d, hi: d };
				list.push(prev);
			}
		}
		return list;
	});

	const curKey = $derived(phaseFor($currentDay, $profile).key);

	let tooltip = $state<string | null>(null);
	let tooltipTimer: ReturnType<typeof setTimeout>;

	function showTooltip(name: string) {
		tooltip = name;
		clearTimeout(tooltipTimer);
		tooltipTimer = setTimeout(() => tooltip = null, 2000);
	}
</script>

{#if $isProgram && runs.length > 0}
	<div class="phase-bar">
		{#each runs as run}
			{@const len = run.hi - run.lo + 1}
			{@const frac = $currentDay > run.hi ? 1 : $currentDay >= run.lo ? ($currentDay - run.lo + 1) / len : 0}
			{@const isCur = run.key === curKey && $currentDay >= run.lo && $currentDay <= run.hi}
			<button
				class="seg"
				class:cur={isCur}
				style:flex={len}
				style:background="{run.color}20"
				onclick={() => showTooltip(run.name)}
			>
				<span class="fill" style:width="{(frac * 100).toFixed(1)}%" style:background={run.color}></span>
				{#if tooltip === run.name}
					<span class="tip">{run.name}</span>
				{/if}
			</button>
		{/each}
	</div>
{/if}

<style>
	.phase-bar {
		display: flex;
		height: 6px;
		gap: 2px;
		margin: 0 18px 12px;
		border-radius: 3px;
		overflow: hidden;
	}
	.seg {
		position: relative;
		border: none;
		padding: 0;
		cursor: pointer;
		border-radius: 3px;
		overflow: hidden;
	}
	.seg.cur {
		outline: 2px solid var(--gold);
		outline-offset: 1px;
	}
	.fill {
		display: block;
		height: 100%;
		border-radius: 3px;
		transition: width 0.3s ease;
	}
	.tip {
		position: absolute;
		bottom: 10px;
		left: 50%;
		transform: translateX(-50%);
		background: var(--ink);
		color: var(--paper);
		font-size: 10px;
		padding: 2px 8px;
		border-radius: 4px;
		white-space: nowrap;
		pointer-events: none;
	}
</style>
