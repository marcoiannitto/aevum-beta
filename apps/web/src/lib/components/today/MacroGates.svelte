<!--
  MacroGates — protein/fat/carbs gate bars with rules-driven thresholds.
  Maps to .gates / renderGates() from index.html.
-->
<script lang="ts">
	import { get } from 'svelte/store';
	import { profile } from '$lib/stores/auth';
	import { currentDay, dayData, totals as calcTotals } from '$lib/stores/day';
	import { phases, phaseFor, phReg, ruleParent } from '$lib/stores/phases';
	import { ruleFor, bandClass, actMacros, type RuleEntry } from '$lib/stores/rules';
	import { effectiveTarget } from '$lib/stores/calorie';

	let day = $derived($dayData);
	let t = $derived(day ? calcTotals(day) : { kcal: 0, protein: 0, fat: 0, carbs: 0, exKcal: 0 });
	// Subscribe to $phases so Svelte 5 re-runs deriveds when phase registry updates (fix #35)
	let phase = $derived(($phases, phaseFor($currentDay, $profile)));
	let reg = $derived(($phases, phReg(phase.key)));
	let isMacroAct = $derived(
		(reg ? reg.use_buckets : (phase.key === 'activation' || phase.key === 'transition')) && actMacros()
	);
	let isActBuckets = $derived(
		(reg ? reg.use_buckets : (phase.key === 'activation' || phase.key === 'transition')) && !actMacros()
	);

	// Resolve pct_of_kcal basis
	function resolvePct(row: RuleEntry | undefined): RuleEntry | undefined {
		if (!row || row.basis !== 'pct_of_kcal') return row;
		const kcal = effectiveTarget($currentDay, $profile);
		if (!kcal) return row;
		const cpg = row.metric === 'fat' ? 9 : 4;
		const resolved = { ...row };
		if (resolved.target != null) resolved.target = Math.round(kcal * (resolved.target / 100) / cpg);
		if (resolved.green_lo != null) resolved.green_lo = Math.round(kcal * (resolved.green_lo / 100) / cpg);
		if (resolved.green_hi != null) resolved.green_hi = Math.round(kcal * (resolved.green_hi / 100) / cpg);
		if (resolved.amber_lo != null) resolved.amber_lo = Math.round(kcal * (resolved.amber_lo / 100) / cpg);
		if (resolved.amber_hi != null) resolved.amber_hi = Math.round(kcal * (resolved.amber_hi / 100) / cpg);
		return resolved;
	}

	interface Gate {
		name: string;
		value: number;
		rule: RuleEntry | undefined;
		plain: boolean; // no rule bar
	}

	let gates = $derived.by((): Gate[] => {
		if (isActBuckets) return []; // buckets model hides macro gates
		if (isMacroAct) {
			return [
				{ name: 'Protein', value: t.protein, rule: ruleFor('activation', 'protein'), plain: false },
				{ name: 'Fat', value: t.fat, rule: undefined, plain: true },
				{ name: 'Carbs', value: t.carbs, rule: ruleFor('activation', 'carbs'), plain: false },
			];
		}
		const rKey = ruleParent(phase.key);
		return [
			{ name: 'Protein', value: t.protein, rule: ruleFor(rKey, 'protein'), plain: !ruleFor(rKey, 'protein') },
			{ name: 'Fat', value: t.fat, rule: ruleFor(rKey, 'fat'), plain: !ruleFor(rKey, 'fat') },
			{ name: 'Carbs', value: t.carbs, rule: ruleFor(rKey, 'carbs'), plain: !ruleFor(rKey, 'carbs') },
		];
	});
</script>

{#if gates.length > 0}
	<div class="gates">
		{#each gates as g (g.name)}
			{@const r = resolvePct(g.rule)}
			{@const tgt = r ? (r.target ?? r.green_hi ?? null) : null}
			{@const cls = r ? bandClass(g.value, r) : ''}
			<div class="gate {g.plain ? 'protein-target' : ''} {cls === '' && !g.plain ? 'prot-ok' : cls}">
				<div class="g-top">
					<span class="g-name">{g.name}</span>
					<span class="g-val num" translate="no">
						{g.value}
						{#if tgt}
							<em> /{tgt}g</em>
						{:else}
							<em>g</em>
						{/if}
					</span>
				</div>
				{#if tgt && !g.plain}
					<div class="g-bar">
						<span style="width:{Math.min(100, g.value / tgt * 100)}%"></span>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.gates { display: flex; gap: 10px; margin-top: 14px; }
	.gate { flex: 1; border: 1px solid var(--line); border-radius: 14px; padding: 11px 12px; background: var(--card); }
	.g-top { display: flex; flex-direction: column; gap: 2px; }
	.g-name { font-size: 12px; color: var(--muted); }
	.g-val { font-family: var(--serif); font-size: 20px; font-weight: 500; line-height: 1.1; }
	.g-val em { font-style: normal; font-size: 12px; color: var(--muted); font-family: var(--sans); }
	.g-bar { height: 5px; border-radius: 4px; background: var(--line-soft); margin-top: 9px; overflow: hidden; }
	.g-bar > span { display: block; height: 100%; background: var(--ok); transition: width 0.35s ease; }
	.gate.warn { border-color: #eBD9A8; background: var(--warn-bg); }
	.gate.warn .g-val, .gate.warn .g-name { color: var(--warn); }
	.gate.warn .g-bar > span { background: var(--warn); }
	.gate.over { border-color: #e9c9c1; background: var(--over-bg); }
	.gate.over .g-val, .gate.over .g-name { color: var(--over); }
	.gate.over .g-bar > span { background: var(--over); }
	.gate.protein-target .g-bar > span { background: var(--gold); }
	.gate.prot-ok { border-color: #cfe0c9; background: #eef4ec; }
	.gate.prot-ok .g-val, .gate.prot-ok .g-name { color: #3f7a4a; }
	.gate.prot-ok .g-bar > span { background: #4a7c59; }
	.gate.prot-ok .g-val em { color: #5a8a63; }
</style>
