<!--
  Meal Log Sheet — log a new meal or edit an existing meal's time.
  Quick-add by description (AI estimate) or manual entry.
-->
<script lang="ts">
	import { get } from 'svelte/store';
	import Sheet from '$lib/components/ui/Sheet.svelte';
	import { dayData, saveDay } from '$lib/stores/day';
	import { currentDay } from '$lib/stores/day';
	import { phaseFor } from '$lib/stores/phases';
	import { aiPost } from '$lib/api/client';

	let {
		open = false,
		onClose,
		editIndex = -1
	}: {
		open: boolean;
		onClose: () => void;
		/** -1 = new meal, >= 0 = editing existing meal at index */
		editIndex?: number;
	} = $props();

	let mode = $state<'quick' | 'manual'>('quick');
	let description = $state('');
	let mealName = $state('');
	let kcal = $state('');
	let protein = $state('');
	let fat = $state('');
	let carbs = $state('');
	let mealTime = $state('');
	let loading = $state(false);
	let error = $state('');

	// If editing, pre-fill
	$effect(() => {
		if (open && editIndex >= 0) {
			const day = get(dayData);
			const meal = day?.meals?.[editIndex];
			if (meal) {
				mode = 'manual';
				mealName = meal.name || '';
				kcal = String(meal.kcal || '');
				protein = String(meal.protein || '');
				fat = String(meal.fat || '');
				carbs = String(meal.carbs || '');
				mealTime = meal.time || new Date().toTimeString().slice(0, 5);
			}
		} else if (open) {
			// Reset for new meal
			mode = 'quick';
			description = '';
			mealName = '';
			kcal = '';
			protein = '';
			fat = '';
			carbs = '';
			mealTime = new Date().toTimeString().slice(0, 5);
			error = '';
		}
	});

	async function quickEstimate() {
		if (!description.trim()) return;
		loading = true;
		error = '';
		try {
			const pk = phaseFor(get(currentDay)).key;
			const d = await aiPost<{ kcal: number; protein: number; fat: number; carbs: number }>({
				action: 'estimate',
				description: description.trim(),
				phase: pk
			});
			mealName = description.trim();
			kcal = String(Math.round(d.kcal));
			protein = String(Math.round(d.protein));
			fat = String(Math.round(d.fat));
			carbs = String(Math.round(d.carbs));
			mode = 'manual'; // switch to manual to let user review/edit
		} catch {
			error = 'Could not estimate. Try manual entry.';
		}
		loading = false;
	}

	function logMeal() {
		const day = get(dayData);
		if (!day) return;
		if (!day.meals) day.meals = [];

		const entry = {
			name: mealName || description || 'Meal',
			kcal: +(kcal || 0),
			protein: +(protein || 0),
			fat: +(fat || 0),
			carbs: +(carbs || 0),
			time: mealTime || new Date().toTimeString().slice(0, 5),
			ts: Date.now()
		};

		if (editIndex >= 0 && day.meals[editIndex]) {
			day.meals[editIndex] = entry;
		} else {
			day.meals.push(entry);
		}

		dayData.set(day);
		saveDay(true);
		onClose();
	}

	function removeMeal() {
		if (editIndex < 0) return;
		const day = get(dayData);
		if (!day?.meals?.[editIndex]) return;
		day.meals.splice(editIndex, 1);
		dayData.set(day);
		saveDay(true);
		onClose();
	}
</script>

<Sheet {open} {onClose} title={editIndex >= 0 ? 'Edit meal' : 'Log a meal'}>
	{#if mode === 'quick' && editIndex < 0}
		<div class="quick">
			<textarea
				bind:value={description}
				placeholder="Describe your meal, e.g.&#10;Grilled chicken, rice, salad"
				rows="3"
			></textarea>
			{#if error}
				<p class="err">{error}</p>
			{/if}
			<button class="btn-primary" onclick={quickEstimate} disabled={loading}>
				{loading ? 'Estimating…' : 'Estimate macros'}
			</button>
			<div class="divider"><span>or</span></div>
			<button class="btn-outline" onclick={() => { mode = 'manual'; }}>Enter manually</button>
		</div>
	{:else}
		<div class="manual">
			<label class="field">
				<span>Meal name</span>
				<input type="text" bind:value={mealName} placeholder="e.g. Lunch" />
			</label>

			<div class="row">
				<label class="field half"><span>kcal</span><input type="number" bind:value={kcal} placeholder="0" /></label>
				<label class="field half"><span>Protein (g)</span><input type="number" bind:value={protein} placeholder="0" /></label>
			</div>
			<div class="row">
				<label class="field half"><span>Fat (g)</span><input type="number" bind:value={fat} placeholder="0" /></label>
				<label class="field half"><span>Carbs (g)</span><input type="number" bind:value={carbs} placeholder="0" /></label>
			</div>

			<label class="field">
				<span>Time</span>
				<input type="time" bind:value={mealTime} />
			</label>

			<button class="btn-primary" onclick={logMeal}>
				{editIndex >= 0 ? 'Save changes' : 'Log meal'}
			</button>

			{#if editIndex >= 0}
				<button class="btn-danger" onclick={removeMeal}>Remove meal</button>
			{/if}

			{#if editIndex < 0}
				<button class="btn-link" onclick={() => { mode = 'quick'; }}>← Back to quick entry</button>
			{/if}
		</div>
	{/if}
</Sheet>

<style>
	.quick textarea, .manual textarea {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: 0.92rem;
		background: #fff;
		resize: vertical;
		font-family: inherit;
	}
	.quick textarea:focus, .manual textarea:focus {
		outline: none;
		border-color: var(--gold);
	}
	.err {
		font-size: 0.82rem;
		color: var(--over);
		margin: 4px 0;
	}
	.btn-primary {
		width: 100%;
		padding: 12px;
		background: var(--gold);
		color: #fff;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.92rem;
		margin-top: 10px;
	}
	.btn-primary:disabled { opacity: 0.5; }
	.btn-outline {
		width: 100%;
		padding: 12px;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: 0.92rem;
		color: var(--ink);
	}
	.btn-danger {
		width: 100%;
		padding: 10px;
		color: var(--over);
		font-size: 0.88rem;
		margin-top: 8px;
	}
	.btn-link {
		width: 100%;
		text-align: center;
		color: var(--gold);
		font-size: 0.85rem;
		padding: 8px;
		margin-top: 4px;
	}
	.divider {
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--muted);
		font-size: 0.8rem;
		margin: 14px 0;
	}
	.divider::before, .divider::after {
		content: '';
		flex: 1;
		border-top: 1px solid var(--line);
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 3px;
		font-size: 0.82rem;
		color: var(--muted);
	}
	.field input {
		padding: 10px 12px;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: 0.92rem;
		background: #fff;
		color: var(--ink);
	}
	.field input:focus {
		outline: none;
		border-color: var(--gold);
	}
	.row {
		display: flex;
		gap: 10px;
	}
	.half { flex: 1; }
	.manual {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
</style>
