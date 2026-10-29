<!--
  Timeline — Meal timeline with bucket model flags, item expansion, meal deletion.
  Maps to #timeline / renderTimeline() from index.html.
-->
<script lang="ts">
	import { profile } from '$lib/stores/auth';
	import { currentDay, dayData, saveDay } from '$lib/stores/day';
	import { phaseFor, phReg } from '$lib/stores/phases';
	import { cfg } from '$lib/stores/config';
	import { fmtTime } from '$lib/helpers/date';
	import type { MealEntry } from '$lib/stores/day';

	const MEAL_KCAL = $derived(cfg('meal_kcal'));
	const MEAL_FAT = $derived(cfg('meal_fat'));
	const MEAL_CARB = $derived(cfg('meal_carb'));

	let phase = $derived(phaseFor($currentDay, $profile));
	let reg = $derived(phReg(phase.key));
	let noMacros = $derived(reg ? !!reg.use_buckets : (phase.key === 'activation' || phase.key === 'transition'));

	let meals = $derived(($dayData?.meals || []).slice());
	let reversed = $derived([...meals].reverse());

	let expandedIdx = $state<number | null>(null);
	let editingTimeIdx = $state<number | null>(null);

	interface ItemEntry {
		name: string;
		type: string;
		verdict: string;
		note?: string;
		grams?: number;
		kcal?: number;
		protein?: number;
		fat?: number;
		carbs?: number;
	}

	function itemFlag(it: ItemEntry): { cls: string; label: string } {
		const grams = +(it.grams || 0);
		const v = it.verdict || 'limited';
		const ty = it.type || 'other';
		if (v === 'no') return { cls: 'bad', label: 'Not allowed' };
		if (v === 'limited') return { cls: 'warn', label: it.note || 'Limited' };
		if (/egg\s*white/i.test(it.name || '')) {
			if (grams > 250) return { cls: 'bad', label: 'Over 6' };
			if (grams > 200) return { cls: 'warn', label: 'Near 6' };
			return { cls: 'ok', label: 'Allowed' };
		}
		const cap = (ty === 'protein' || ty === 'veg') ? { amber: 111, red: 131 } : { amber: 111, red: Infinity };
		if (grams > cap.red) return { cls: 'bad', label: 'Too much' };
		if (grams > cap.amber) return { cls: 'warn', label: `Over ${cap.amber}g` };
		return { cls: 'ok', label: 'Allowed' };
	}

	function mealStatus(m: MealEntry): string {
		const items: ItemEntry[] = (m as any).items || [];
		if (items.some(it => itemFlag(it).cls === 'bad')) return 'bad';
		if (items.some(it => itemFlag(it).cls === 'warn')) return 'warn';
		return 'ok';
	}

	function removeMeal(originalIdx: number) {
		if (!$dayData) return;
		$dayData.meals = $dayData.meals.filter((_: any, i: number) => i !== originalIdx);
		saveDay();
	}

	function toggleExpand(originalIdx: number) {
		expandedIdx = expandedIdx === originalIdx ? null : originalIdx;
	}

	function originalIndex(reversedIdx: number): number {
		return meals.length - 1 - reversedIdx;
	}

	function startEditTime(oi: number, e: Event) {
		e.stopPropagation();
		editingTimeIdx = oi;
	}

	function commitTime(oi: number, e: Event) {
		const input = e.target as HTMLInputElement;
		const val = input.value; // "HH:MM"
		if (!$dayData || !val) { editingTimeIdx = null; return; }
		$dayData.meals[oi].time = val;
		$dayData.meals[oi].ts = null; // clear ts so time takes priority
		editingTimeIdx = null;
		saveDay();
	}

	function cancelEditTime() {
		editingTimeIdx = null;
	}
</script>

{#if meals.length === 0}
	<div class="tl-empty">No meals logged yet.</div>
{:else}
	<div class="timeline">
		<div class="tl-head">Today's meals</div>
		{#each reversed as meal, ri}
			{@const oi = originalIndex(ri)}
			{@const isOpen = expandedIdx === oi}
			{@const items = ((meal as any).items || []) as ItemEntry[]}
			{@const hasItems = items.length > 0}
			<div class="meal-row">
				{#if editingTimeIdx === oi}
				<input
					class="meal-time-input"
					type="time"
					value={meal.time || (meal.ts ? fmtTime(meal.ts) : '')}
					onchange={(e) => commitTime(oi, e)}
					onblur={() => cancelEditTime()}
					autofocus
				/>
			{:else}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="meal-time" translate="no" onclick={(e) => startEditTime(oi, e)}>{meal.time || (meal.ts ? fmtTime(meal.ts) : '– –')}</div>
			{/if}
				<div class="meal-body" class:open={isOpen} role="button" tabindex="0" onclick={() => toggleExpand(oi)} onkeydown={(e) => e.key === 'Enter' && toggleExpand(oi)}>
					{#if noMacros}
						{@const st = mealStatus(meal)}
						{@const kc = Math.round(meal.kcal || 0)}
						{@const pv = Math.round(meal.protein || 0)}
						{@const fv = Math.round(meal.fat || 0)}
						{@const cv = Math.round(meal.carbs || 0)}
						<div class="meal-head">
							<span class="meal-name">{meal.name || 'Meal'}</span>
							<span class="mi-dot {st}"></span>
						</div>
						<div class="meal-macros" translate="no">
							<b class={kc > MEAL_KCAL ? 'over' : ''}>{kc}</b> kcal
							<span class="mac">{pv}P</span>
							<span class="mac" class:over={fv > MEAL_FAT}>{fv}F</span>
							<span class="mac" class:over={cv > MEAL_CARB}>{cv}C</span>
						</div>
						{#if hasItems}
							<div class="mi-list" class:collapsed={!isOpen}>
								{#each items as it}
									{@const f = itemFlag(it)}
									<div class="mi">
										<span class="mi-dot {f.cls}"></span>
										<span class="mi-name">{it.name} <span translate="no">{it.grams || 0}g</span></span>
										<span class="mi-mac" translate="no">{Math.round(it.kcal || 0)} · {Math.round(it.protein || 0)}P {Math.round(it.fat || 0)}F {Math.round(it.carbs || 0)}C</span>
										<span class="mi-flag {f.cls}">{f.label}</span>
									</div>
								{/each}
							</div>
						{/if}
					{:else}
						<div class="meal-name">
							{meal.name || 'Meal'}
							{#if hasItems}<span class="meal-chevron">▶</span>{/if}
						</div>
						<div class="meal-macros" translate="no">
							<b>{Math.round(meal.kcal || 0)}</b> kcal
							<span class="sep">·</span>{Math.round(meal.protein || 0)}P
							<span class="sep">·</span>{Math.round(meal.fat || 0)}F
							<span class="sep">·</span>{Math.round(meal.carbs || 0)}C
						</div>
						{#if hasItems}
							<div class="mi-list" class:collapsed={!isOpen}>
								{#each items as it}
									<div class="mi">
										<span class="mi-name">{it.name} <span translate="no">{it.grams || 0}g</span></span>
										<span class="mi-mac" translate="no">{Math.round(it.kcal || 0)} · {Math.round(it.protein || 0)}P {Math.round(it.fat || 0)}F {Math.round(it.carbs || 0)}C</span>
									</div>
								{/each}
							</div>
						{/if}
					{/if}
				</div>
				<button class="meal-del" onclick={(e) => { e.stopPropagation(); removeMeal(oi); }}>×</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	.tl-empty { text-align: center; color: var(--muted); font-size: 14px; padding: 22px 10px; border: 1px dashed var(--line); border-radius: 16px; }
	.tl-head { font-size: 13px; color: var(--muted); margin: 2px 2px 6px; }
	.meal-row { display: flex; gap: 12px; padding: 14px 4px; border-bottom: 1px solid var(--line-soft); }
	.meal-row:last-child { border-bottom: none; }
	.meal-time { font-size: 12px; color: var(--muted); width: 42px; flex-shrink: 0; padding-top: 2px; font-variant-numeric: tabular-nums; cursor: pointer; border-radius: 4px; }
	.meal-time:hover { background: var(--line-soft); }
	.meal-time-input { width: 52px; flex-shrink: 0; font-size: 12px; padding: 2px 0; border: 1px solid var(--gold); border-radius: 4px; background: var(--paper); color: var(--ink); font-family: inherit; font-variant-numeric: tabular-nums; }
	.meal-body { flex: 1; min-width: 0; cursor: pointer; }
	.meal-name { font-size: 15px; font-weight: 500; margin-bottom: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.meal-body.open .meal-name { white-space: normal; overflow: visible; }
	.meal-macros { font-size: 13px; color: var(--ink-soft); }
	.meal-macros b { font-family: var(--serif); font-weight: 500; }
	.meal-macros .sep { color: var(--line); margin: 0 5px; }
	.meal-macros .mac { margin-left: 4px; }
	.meal-macros .over, .meal-macros b.over { color: var(--over); }
	.meal-del { align-self: center; color: var(--muted); font-size: 19px; padding: 6px; flex-shrink: 0; border: none; background: transparent; cursor: pointer; }
	.meal-del:hover { color: var(--over); }
	.meal-head { display: flex; align-items: center; gap: 8px; }
	.meal-head .meal-name { flex: 1; min-width: 0; margin-bottom: 0; }
	.meal-head .mi-dot { width: 9px; height: 9px; flex-shrink: 0; }
	.mi-list { margin-top: 7px; display: flex; flex-direction: column; gap: 5px; }
	.mi-list.collapsed { display: none; }
	.mi { display: flex; align-items: center; gap: 8px; font-size: 13px; }
	.mi-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
	.mi-dot.ok { background: #4a7c59; }
	.mi-dot.warn { background: var(--warn); }
	.mi-dot.bad { background: var(--over); }
	.mi-name { color: var(--ink-soft); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.mi-mac { margin-left: auto; font-size: 12px; color: var(--muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
	.meal-chevron { font-size: 10px; color: var(--muted); margin-left: 6px; transition: transform 0.2s; }
	.meal-body.open .meal-chevron { transform: rotate(90deg); }
	.mi-flag { margin-left: auto; flex-shrink: 0; font-size: 12px; font-weight: 600; }
	.mi-flag.ok { color: #4a7c59; }
	.mi-flag.warn { color: var(--warn); }
	.mi-flag.bad { color: var(--over); }
</style>
