<script lang="ts">
	import { dayData, saveDay } from '$lib/stores/day';
	import { fmtTime } from '$lib/helpers/date';
	import type { MealEntry } from '$lib/stores/day';

	let showAddMeal = $state(false);
	let newName = $state('');
	let newKcal = $state('');
	let newProtein = $state('');
	let newFat = $state('');
	let newCarbs = $state('');

	const meals = $derived(($dayData?.meals || []).slice().sort((a, b) => (a.ts || 0) - (b.ts || 0)));

	function addMeal() {
		if (!newName.trim() || !newKcal) return;
		if (!$dayData) return;

		const entry: MealEntry = {
			name: newName.trim(),
			kcal: +newKcal || 0,
			protein: +newProtein || 0,
			fat: +newFat || 0,
			carbs: +newCarbs || 0,
			time: new Date().toTimeString().slice(0, 5),
			ts: Date.now()
		};

		$dayData.meals = [...$dayData.meals, entry];
		saveDay();

		// Reset form
		newName = '';
		newKcal = '';
		newProtein = '';
		newFat = '';
		newCarbs = '';
		showAddMeal = false;
	}

	function removeMeal(idx: number) {
		if (!$dayData) return;
		$dayData.meals = $dayData.meals.filter((_, i) => i !== idx);
		saveDay();
	}
</script>

<section class="timeline">
	<div class="sec-header">
		<h3>Meals</h3>
		<button class="add-btn" onclick={() => showAddMeal = !showAddMeal}>
			{showAddMeal ? '✕' : '+'}
		</button>
	</div>

	{#if showAddMeal}
		<div class="add-form">
			<input type="text" bind:value={newName} placeholder="What did you eat?" class="meal-input" />
			<div class="macro-inputs">
				<input type="number" bind:value={newKcal} placeholder="kcal" />
				<input type="number" bind:value={newProtein} placeholder="P(g)" />
				<input type="number" bind:value={newFat} placeholder="F(g)" />
				<input type="number" bind:value={newCarbs} placeholder="C(g)" />
			</div>
			<button class="save-btn" onclick={addMeal}>Add meal</button>
		</div>
	{/if}

	{#if meals.length === 0}
		<p class="empty">No meals logged yet</p>
	{:else}
		<div class="meal-list">
			{#each meals as meal, i}
				<div class="meal-row">
					<div class="meal-time">{meal.time || fmtTime(meal.ts)}</div>
					<div class="meal-body">
						<span class="meal-name">{meal.name}</span>
						<span class="meal-macros">
							{meal.kcal} kcal
							{#if meal.protein}· {meal.protein}P{/if}
							{#if meal.fat}· {meal.fat}F{/if}
							{#if meal.carbs}· {meal.carbs}C{/if}
						</span>
					</div>
					<button class="del-btn" onclick={() => removeMeal(i)}>✕</button>
				</div>
			{/each}
		</div>
	{/if}
</section>

<style>
	.timeline {
		padding: 0 18px 16px;
	}
	.sec-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}
	h3 {
		font-size: 14px;
		font-weight: 600;
		margin: 0;
		color: var(--ink);
	}
	.add-btn {
		width: 28px;
		height: 28px;
		border: 1px solid var(--line);
		border-radius: 50%;
		background: transparent;
		font-size: 16px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--ink);
	}
	.add-form {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
		background: var(--card, #fff);
		border: 1px solid var(--line);
		border-radius: 12px;
		margin-bottom: 12px;
	}
	.meal-input {
		padding: 8px 10px;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: 14px;
		font-family: inherit;
	}
	.macro-inputs {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 6px;
	}
	.macro-inputs input {
		padding: 6px;
		border: 1px solid var(--line);
		border-radius: 6px;
		font-size: 12px;
		text-align: center;
		font-family: inherit;
	}
	.save-btn {
		padding: 8px;
		background: var(--gold);
		color: #fff;
		border: none;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
	}
	.empty {
		text-align: center;
		color: var(--muted);
		font-size: 13px;
		padding: 20px;
		border: 1px dashed var(--line);
		border-radius: 12px;
	}
	.meal-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.meal-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		background: var(--card, #fff);
		border: 1px solid var(--line);
		border-radius: 10px;
	}
	.meal-time {
		font-size: 12px;
		color: var(--muted);
		min-width: 40px;
		font-variant-numeric: tabular-nums;
	}
	.meal-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.meal-name {
		font-size: 14px;
		font-weight: 500;
	}
	.meal-macros {
		font-size: 11px;
		color: var(--muted);
	}
	.del-btn {
		width: 24px;
		height: 24px;
		border: none;
		background: transparent;
		color: var(--muted);
		font-size: 12px;
		cursor: pointer;
		border-radius: 50%;
	}
	.del-btn:hover {
		background: #fef2f2;
		color: var(--over);
	}
</style>
