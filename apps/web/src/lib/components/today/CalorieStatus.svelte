<!--
  CalorieStatus — calorie count, progress bar with bank adjustment, disclaimer.
  Maps to .status / renderCalories() from index.html.
-->
<script lang="ts">
	import { get } from 'svelte/store';
	import { profile } from '$lib/stores/auth';
	import { currentDay, dayData, totals as calcTotals } from '$lib/stores/day';
	import { phases, phaseFor, phReg, ruleParent } from '$lib/stores/phases';
	import { ruleFor, bandClass, actMacros } from '$lib/stores/rules';
	import { effectiveTarget, mifflin } from '$lib/stores/calorie';
	import MacroGates from './MacroGates.svelte';
	import FoodBuckets from './FoodBuckets.svelte';

	let day = $derived($dayData);
	let t = $derived(day ? calcTotals(day) : { kcal: 0, protein: 0, fat: 0, carbs: 0, exKcal: 0 });
	// Subscribe to $phases so Svelte 5 re-runs deriveds when phase registry updates (fix #35)
	let phase = $derived(($phases, phaseFor($currentDay, $profile)));
	let reg = $derived(($phases, phReg(phase.key)));
	let isMacroAct = $derived(
		(reg ? reg.use_buckets : (phase.key === 'activation' || phase.key === 'transition')) && actMacros()
	);

	// Calorie bar logic
	let showBar = $derived.by(() => {
		void $phases; // track phase registry updates (fix #35b)
		const calMode = reg?.calorie_mode;
		const tMode = reg?.target_mode || 'none';
		return calMode === 'bar' || tMode === 'tdee_mult' || tMode === 'ramp_then_hold' || isMacroAct;
	});

	let hasBank = $derived(!!(reg && +(reg.bank_window || 0)));

	let target = $derived.by(() => {
		void $phases; // track phase registry updates (fix #35b)
		if (isMacroAct) {
			const kr = ruleFor('activation', 'kcal');
			return (kr && kr.target) ? kr.target : 650;
		}
		return effectiveTarget($currentDay, $profile);
	});

	let barPct = $derived(target > 0 ? Math.min(100, t.kcal / target * 100) : 0);

	let barCls = $derived.by(() => {
		const rKey = isMacroAct ? 'activation' : ruleParent(phase.key);
		const kr = ruleFor(rKey, 'kcal');
		if (!kr) return '';
		const val = isMacroAct ? t.kcal : (target > 0 ? t.kcal / target * 100 : 0);
		return bandClass(val, kr);
	});

	let showExplainer = $state(false);
</script>

<div class="status">
	<div class="cals">
		<span class="big num">{t.kcal.toLocaleString()}</span>
		<span class="unit">kcal today</span>
	</div>

	{#if showBar}
		<div class="calbar-wrap">
			<div class="calbar {barCls}">
				<span style="width:{barPct}%"></span>
			</div>
			<div class="calbar-label">
				<span>
					{t.kcal.toLocaleString()} / {target.toLocaleString()} kcal
					{#if hasBank}
						<button class="cb-info" onclick={() => showExplainer = !showExplainer}>ⓘ</button>
					{/if}
				</span>
				<span>{t.exKcal > 0 ? `${t.exKcal} kcal exercise` : ''}</span>
			</div>
			{#if hasBank && showExplainer}
				<div class="cb-explainer">
					Your target adjusts based on the last few days, so one big meal or a light day won't throw you off. Focus on today.
				</div>
			{/if}
		</div>
	{/if}

	<MacroGates />
	<FoodBuckets />
	<div class="cal-disclaimer">Targets are estimates. Consult your doctor for personalised advice.</div>
</div>

<style>
	.status { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 16px 16px 14px; margin-bottom: 12px; }
	.cals { display: flex; align-items: baseline; gap: 8px; }
	.cals .big { font-family: var(--serif); font-size: 40px; font-weight: 500; line-height: 1; }
	.cals .unit { font-size: 13px; color: var(--muted); }
	.calbar-wrap { margin-top: 12px; }
	.calbar { height: 8px; border-radius: 6px; background: var(--line-soft); overflow: hidden; }
	.calbar > span { display: block; height: 100%; border-radius: 6px; background: var(--gold); transition: width 0.35s ease; }
	.calbar.warn > span { background: var(--warn); }
	.calbar.over > span { background: var(--over); }
	.calbar-label { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-top: 6px; }
	.cb-info { font-size: 13px; color: var(--muted); cursor: pointer; margin-left: 4px; opacity: 0.6; }
	.cb-explainer { font-size: 12px; line-height: 1.5; color: var(--muted); background: var(--card-soft, #f5f0e8); border-radius: 8px; padding: 10px 12px; margin-top: 6px; }
	.cal-disclaimer { margin-top: 10px; font-size: 11px; color: var(--muted, #938c7d); text-align: center; line-height: 1.4; }
</style>
