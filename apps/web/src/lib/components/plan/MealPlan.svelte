<!--
  MealPlan — calendar + day's meals from coach plan.
  Maps to renderPlan() from index.html.
-->
<script lang="ts">
	import { get } from 'svelte/store';
	import { profile } from '$lib/stores/auth';
	import { phaseFor } from '$lib/stores/phases';
	import { totalDays } from '$lib/stores/phases';
	import { dayData, saveDay } from '$lib/stores/day';
	import { planDay, planItemsFor, planDaysAvailable, planEdit, ensureEditable, savePlanEdit, loadPlan, type PlanItem } from '$lib/stores/plan';
	import { onMount } from 'svelte';

	let calMonth = $state({ year: new Date().getFullYear(), month: new Date().getMonth() });
	let selectedDay = $state(1);

	const total = $derived(totalDays($profile) || 31);

	// Start date
	function startDate(): Date | null {
		const sd = $profile?.start_date || ($profile as Record<string, unknown>)?.start;
		if (!sd) return null;
		const d = new Date(String(sd) + 'T00:00:00');
		return isNaN(d.getTime()) ? null : d;
	}

	function todayDayNum(): number {
		const sd = startDate();
		if (!sd) return 1;
		const now = new Date(); now.setHours(0,0,0,0);
		return Math.max(1, Math.floor((now.getTime() - sd.getTime()) / 86400000) + 1);
	}

	// Calendar data
	const daysInMonth = $derived(new Date(calMonth.year, calMonth.month + 1, 0).getDate());
	const firstDow = $derived((new Date(calMonth.year, calMonth.month, 1).getDay() + 6) % 7); // Mon=0
	const monthLabel = $derived(new Date(calMonth.year, calMonth.month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }));

	const planned = $derived(new Set(planDaysAvailable()));

	interface CellData {
		date: number;
		dayNum: number | null;
		valid: boolean;
		isToday: boolean;
		isOn: boolean;
		hasPlan: boolean;
		color: string;
	}

	const cells = $derived.by((): CellData[] => {
		const sd = startDate();
		const today = new Date(); today.setHours(0,0,0,0);
		const tdn = todayDayNum();
		const result: CellData[] = [];

		for (let d = 1; d <= daysInMonth; d++) {
			const cellDate = new Date(calMonth.year, calMonth.month, d);
			let dn: number | null = null;
			if (sd) dn = Math.floor((cellDate.getTime() - sd.getTime()) / 86400000) + 1;
			const valid = dn !== null && dn >= 1;
			const pf = valid ? phaseFor(dn!) : null;
			result.push({
				date: d,
				dayNum: dn,
				valid,
				isToday: cellDate.getTime() === today.getTime(),
				isOn: valid && dn === selectedDay,
				hasPlan: valid && planned.has(dn!),
				color: pf?.color ?? 'var(--muted)'
			});
		}
		return result;
	});

	// Selected day's meals
	const items = $derived(planItemsFor(selectedDay));
	const edited = $derived(!!get(planEdit)[selectedDay]);
	const dayPhase = $derived(phaseFor(selectedDay));

	const dayTotals = $derived.by(() => {
		let kcal = 0, protein = 0, fat = 0, carbs = 0;
		items.forEach(i => { kcal += +i.kcal || 0; protein += +i.protein || 0; fat += +i.fat || 0; carbs += +i.carbs || 0; });
		return { kcal: Math.round(kcal), protein: Math.round(protein), fat: Math.round(fat), carbs: Math.round(carbs) };
	});

	function selectDay(dn: number) {
		selectedDay = dn;
		planDay.set(dn);
	}

	function prevMonth() { calMonth = { ...calMonth, month: calMonth.month - 1 < 0 ? 11 : calMonth.month - 1, year: calMonth.month - 1 < 0 ? calMonth.year - 1 : calMonth.year }; }
	function nextMonth() { calMonth = { ...calMonth, month: calMonth.month + 1 > 11 ? 0 : calMonth.month + 1, year: calMonth.month + 1 > 11 ? calMonth.year + 1 : calMonth.year }; }

	function logMeal(item: PlanItem) {
		const dd = get(dayData);
		if (!dd) return;
		dd.meals.push({ name: item.recipe, kcal: +item.kcal || 0, protein: +item.protein || 0, fat: +item.fat || 0, carbs: +item.carbs || 0, time: new Date().toTimeString().slice(0, 5), ts: Date.now() });
		saveDay();
	}

	function removeMeal(idx: number) {
		ensureEditable(selectedDay);
		const edits = get(planEdit);
		edits[selectedDay].splice(idx, 1);
		planEdit.set(edits);
		savePlanEdit();
	}

	function resetDay() {
		const edits = get(planEdit);
		delete edits[selectedDay];
		planEdit.set(edits);
		savePlanEdit();
	}

	onMount(() => {
		selectedDay = todayDayNum();
		planDay.set(selectedDay);
		loadPlan();
	});
</script>

<div class="mealplan">
	<!-- Calendar nav -->
	<div class="mc-nav">
		<button class="arrow" onclick={prevMonth}>‹</button>
		<span class="mc-label">{monthLabel}</span>
		<button class="arrow" onclick={nextMonth}>›</button>
	</div>

	<!-- Calendar grid -->
	<div class="mc-grid">
		{#each ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as dow}
			<div class="mc-dow">{dow}</div>
		{/each}
		{#each Array(firstDow) as _}
			<div class="mc-day out"></div>
		{/each}
		{#each cells as cell}
			<button
				class="mc-day"
				class:on={cell.isOn}
				class:today={cell.isToday}
				class:out={!cell.valid}
				style="--pc:{cell.color}"
				disabled={!cell.valid}
				onclick={() => cell.dayNum && selectDay(cell.dayNum)}
			>
				<span class="mc-date">{cell.date}</span>
				{#if cell.valid}<span class="mc-dnum">D{cell.dayNum}</span>{/if}
				{#if cell.hasPlan}<span class="mc-dot"></span>{/if}
			</button>
		{/each}
	</div>

	<!-- Day header -->
	<div class="plan-day-head">
		<span class="pdh-dot" style="background:{dayPhase.color}"></span>
		<b>Day {selectedDay}</b> · {dayPhase.name}
		{#if selectedDay === todayDayNum()} · Today{/if}
	</div>

	<!-- Macro summary -->
	<div class="ptt-grid">
		<div class="ptt-cell"><div class="ptt-v">{dayTotals.kcal}</div><div class="ptt-k">kcal</div></div>
		<div class="ptt-cell"><div class="ptt-v">{dayTotals.protein}</div><div class="ptt-k">protein</div></div>
		<div class="ptt-cell"><div class="ptt-v">{dayTotals.fat}</div><div class="ptt-k">fat</div></div>
		<div class="ptt-cell"><div class="ptt-v">{dayTotals.carbs}</div><div class="ptt-k">carbs</div></div>
	</div>

	<!-- Meal list -->
	{#if !items.length}
		<div class="plan-empty">No meals for this day.</div>
	{:else}
		{#each items as item, idx}
			<div class="plan-meal">
				<div class="pm-head">
					<span class="pm-slot">{item.meal || `Meal ${idx + 1}`}</span>
					<button class="pm-remove" onclick={() => removeMeal(idx)}>Remove</button>
				</div>
				<div class="pm-name">{item.recipe}</div>
				<div class="pm-macros">
					<b>{Math.round(item.kcal)}</b> kcal · {Math.round(item.protein)}P · {Math.round(item.fat)}F · {Math.round(item.carbs)}C
				</div>
				<div class="pm-actions">
					<button class="pm-btn" onclick={() => logMeal(item)}>Log today</button>
				</div>
			</div>
		{/each}
	{/if}

	{#if edited}
		<button class="plan-reset" onclick={resetDay}>Reset to coach's plan</button>
	{/if}
</div>

<style>
	.mealplan { display: flex; flex-direction: column; gap: 8px; }
	.mc-nav {
		display: flex; align-items: center; justify-content: space-between;
		margin-bottom: 8px;
	}
	.arrow {
		width: 32px; height: 32px; border: 1px solid var(--line);
		border-radius: 8px; background: var(--card, #fff);
		font-size: 18px; cursor: pointer; font-family: inherit;
	}
	.mc-label { font-size: 15px; font-weight: 600; }
	.mc-grid {
		display: grid; grid-template-columns: repeat(7, 1fr);
		gap: 2px; margin-bottom: 12px;
	}
	.mc-dow { font-size: 10px; color: var(--muted); text-align: center; padding: 4px; }
	.mc-day {
		position: relative; padding: 6px 2px;
		text-align: center; border: none; background: var(--card, #fff);
		border-radius: 8px; cursor: pointer; font-family: inherit;
		border-left: 2px solid var(--pc, transparent);
	}
	.mc-day.out { opacity: 0.3; cursor: default; }
	.mc-day.on { background: var(--gold); color: #fff; }
	.mc-day.today .mc-date { font-weight: 700; text-decoration: underline; }
	.mc-date { font-size: 13px; display: block; }
	.mc-dnum { font-size: 9px; color: var(--muted); display: block; }
	.mc-day.on .mc-dnum { color: rgba(255,255,255,.7); }
	.mc-dot {
		position: absolute; bottom: 2px; left: 50%;
		transform: translateX(-50%); width: 4px; height: 4px;
		border-radius: 50%; background: var(--gold);
	}
	.mc-day.on .mc-dot { background: #fff; }

	.plan-day-head {
		font-size: 14px; padding: 8px 0;
		display: flex; align-items: center; gap: 6px;
	}
	.pdh-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

	.ptt-grid {
		display: grid; grid-template-columns: repeat(4, 1fr);
		gap: 6px; margin-bottom: 12px;
	}
	.ptt-cell {
		text-align: center; padding: 10px 4px;
		background: var(--card, #fff);
		border: 1px solid var(--line);
		border-radius: 10px;
	}
	.ptt-v { font-family: var(--serif); font-size: 18px; font-weight: 500; }
	.ptt-k { font-size: 10px; color: var(--muted); text-transform: uppercase; }

	.plan-meal {
		padding: 14px; background: var(--card, #fff);
		border: 1px solid var(--line); border-radius: 12px;
		margin-bottom: 6px;
	}
	.pm-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
	.pm-slot { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
	.pm-remove { font-size: 11px; color: var(--red, #A13024); background: none; border: none; cursor: pointer; }
	.pm-name { font-size: 15px; font-weight: 500; margin-bottom: 4px; }
	.pm-macros { font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }
	.pm-actions { display: flex; gap: 6px; margin-top: 8px; }
	.pm-btn {
		padding: 6px 12px; border: 1px solid var(--line);
		border-radius: 8px; font-size: 12px;
		background: var(--card, #fff); cursor: pointer;
		font-family: inherit;
	}

	.plan-empty { text-align: center; color: var(--muted); font-size: 13px; padding: 30px; }
	.plan-reset {
		width: 100%; padding: 10px;
		border: 1px solid var(--line); border-radius: 10px;
		background: var(--card, #fff); font-size: 13px;
		color: var(--muted); cursor: pointer; font-family: inherit;
	}
</style>
