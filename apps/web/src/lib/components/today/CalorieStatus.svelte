<!-- v3.5.0 2026-10-27 — #80: eaten kcal hero, target/remaining subtitle -->
<script lang="ts">
	import { get } from 'svelte/store';
	import { profile } from '$lib/stores/auth';
	import { currentDay, dayData, totals as calcTotals } from '$lib/stores/day';
	import { phases, phaseFor, phReg, ruleParent } from '$lib/stores/phases';
	import { ruleFor, bandClass, actMacros } from '$lib/stores/rules';
	import { effectiveTarget, bankAdjustment, mifflin } from '$lib/stores/calorie';
	import MacroGates from './MacroGates.svelte';
	import FoodBuckets from './FoodBuckets.svelte';

	let day = $derived($dayData);
	let t = $derived(day ? calcTotals(day) : { kcal: 0, protein: 0, fat: 0, carbs: 0, exKcal: 0 });
	let phase = $derived(($phases, phaseFor($currentDay, $profile)));
	let reg = $derived(($phases, phReg(phase.key)));
	let isMacroAct = $derived(
		(reg ? reg.use_buckets : (phase.key === 'activation' || phase.key === 'transition')) && actMacros()
	);

	let showBar = $derived.by(() => {
		void $phases;
		const calMode = reg?.calorie_mode;
		const tMode = reg?.target_mode || 'none';
		return calMode === 'bar' || tMode === 'tdee_mult' || tMode === 'ramp_then_hold' || isMacroAct;
	});

	let hasBank = $derived(!!(reg && +(reg.bank_window || 0)));
	let bankAdj = $derived(hasBank ? bankAdjustment($currentDay) : 0);

	let target = $derived.by(() => {
		void $phases;
		if (isMacroAct) {
			const kr = ruleFor('activation', 'kcal');
			return (kr && kr.target) ? kr.target : 650;
		}
		return effectiveTarget($currentDay, $profile);
	});

	let remaining = $derived(Math.max(0, target - t.kcal));
	let overBy = $derived(t.kcal > target ? t.kcal - target : 0);
	let barPct = $derived(target > 0 ? Math.min(100, t.kcal / target * 100) : 0);

	let barCls = $derived.by(() => {
		const rKey = isMacroAct ? 'activation' : ruleParent(phase.key);
		const kr = ruleFor(rKey, 'kcal');
		if (!kr) return '';
		const val = isMacroAct ? t.kcal : (target > 0 ? t.kcal / target * 100 : 0);
		return bandClass(val, kr);
	});

	let showHint = $state(false);
</script>

<div class="status">
	<div class="hero">
		<span class="big num">{t.kcal.toLocaleString()}</span>
		<span class="unit">kcal eaten</span>
	</div>
	<div class="hero-sub">
		{#if overBy > 0}
			<span class="sub-over">{overBy.toLocaleString()} over</span>
			<span class="sub-target">({target.toLocaleString()} target)</span>
		{:else}
			<span class="sub-remain">{remaining.toLocaleString()} of {target.toLocaleString()} left</span>
		{/if}
	</div>

	{#if showBar}
		<div class="calbar-wrap">
			<div class="calbar {barCls}">
				<span style="width:{barPct}%"></span>
			</div>
			<div class="calbar-label">
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<span class="target-tap" onclick={() => { if (hasBank) showHint = !showHint; }}>
					{barPct.toFixed(0)}%
					{#if hasBank && bankAdj !== 0}
						<span class="adj-dot {bankAdj > 0 ? 'pos' : 'neg'}"></span>
					{/if}
				</span>
				<span>{t.exKcal > 0 ? `${t.exKcal} exercise` : ''}</span>
			</div>
			{#if showHint}
				<div class="hint">Your target adapts weekly based on what you ate.</div>
			{/if}
		</div>
	{/if}

	<MacroGates />
	<FoodBuckets />
	<div class="cal-disclaimer">Targets are estimates. Consult your doctor for personalised advice.</div>
</div>

<style>
	.status { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 16px 16px 14px; margin-bottom: 12px; }
	.hero { display: flex; align-items: baseline; gap: 8px; }
	.hero .big { font-family: var(--serif); font-size: 40px; font-weight: 500; line-height: 1; }
	.hero .unit { font-size: 13px; color: var(--muted); }
	.hero-sub { font-size: 13px; color: var(--muted); margin-top: 2px; }
	.hero-sub .sub-over { color: var(--over, #A13024); font-weight: 500; }
	.hero-sub .sub-target { color: var(--muted); margin-left: 4px; }
	.hero-sub .sub-remain { color: var(--ok, #2d6a4f); }
	.calbar-wrap { margin-top: 12px; }
	.calbar { height: 8px; border-radius: 6px; background: var(--line-soft); overflow: hidden; }
	.calbar > span { display: block; height: 100%; border-radius: 6px; background: var(--gold); transition: width 0.35s ease; }
	.calbar.warn > span { background: var(--warn); }
	.calbar.over > span { background: var(--over); }
	.calbar-label { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-top: 6px; }
	.target-tap { cursor: default; }
	.adj-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-left: 4px; vertical-align: middle; }
	.adj-dot.pos { background: var(--green, #2d6a4f); }
	.adj-dot.neg { background: var(--over, #A13024); }
	.hint { font-size: 11px; color: var(--muted); margin-top: 6px; }
	.cal-disclaimer { margin-top: 10px; font-size: 11px; color: var(--muted, #938c7d); text-align: center; line-height: 1.4; }
</style>
