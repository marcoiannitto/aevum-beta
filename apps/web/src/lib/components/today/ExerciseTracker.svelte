<script lang="ts">
	import { dayData, saveDay } from '$lib/stores/day';
	import type { ExerciseEntry } from '$lib/stores/day';

	let showAdd = $state(false);
	let newName = $state('');
	let newKcal = $state('');
	let newMins = $state('');

	const exercises = $derived($dayData?.exercise ?? []);
	const totalKcal = $derived(exercises.reduce((s, e) => s + (e.kcal || 0), 0));

	function add() {
		if (!newName.trim() || !$dayData) return;
		const entry: ExerciseEntry = {
			name: newName.trim(),
			kcal: +newKcal || 0,
			mins: +newMins || 0
		};
		$dayData.exercise = [...$dayData.exercise, entry];
		saveDay();
		newName = ''; newKcal = ''; newMins = '';
		showAdd = false;
	}

	function remove(idx: number) {
		if (!$dayData) return;
		$dayData.exercise = $dayData.exercise.filter((_, i) => i !== idx);
		saveDay();
	}
</script>

<section class="exercise">
	<div class="sec-header">
		<h3>Exercise</h3>
		<span class="ex-total">{totalKcal} kcal burned</span>
		<button class="add-btn" onclick={() => showAdd = !showAdd}>
			{showAdd ? '✕' : '+'}
		</button>
	</div>

	{#if showAdd}
		<div class="add-form">
			<input type="text" bind:value={newName} placeholder="Activity" class="ex-input" />
			<div class="row-inputs">
				<input type="number" bind:value={newMins} placeholder="mins" />
				<input type="number" bind:value={newKcal} placeholder="kcal" />
			</div>
			<button class="save-btn" onclick={add}>Add</button>
		</div>
	{/if}

	{#if exercises.length > 0}
		<div class="ex-list">
			{#each exercises as ex, i}
				<div class="ex-row">
					<span class="ex-name">{ex.name}</span>
					<span class="ex-meta">{ex.mins}min · {ex.kcal}kcal</span>
					<button class="del-btn" onclick={() => remove(i)}>✕</button>
				</div>
			{/each}
		</div>
	{/if}
</section>

<style>
	.exercise { padding: 0 18px 16px; }
	.sec-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}
	h3 { font-size: 14px; font-weight: 600; margin: 0; }
	.ex-total { font-size: 12px; color: var(--muted); flex: 1; }
	.add-btn {
		width: 28px; height: 28px;
		border: 1px solid var(--line); border-radius: 50%;
		background: transparent; font-size: 16px; cursor: pointer;
		display: flex; align-items: center; justify-content: center;
		color: var(--ink);
	}
	.add-form {
		display: flex; flex-direction: column; gap: 8px;
		padding: 12px; background: var(--card, #fff);
		border: 1px solid var(--line); border-radius: 12px;
		margin-bottom: 12px;
	}
	.ex-input {
		padding: 8px 10px; border: 1px solid var(--line);
		border-radius: 8px; font-size: 14px; font-family: inherit;
	}
	.row-inputs {
		display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
	}
	.row-inputs input {
		padding: 6px; border: 1px solid var(--line);
		border-radius: 6px; font-size: 12px; text-align: center;
		font-family: inherit;
	}
	.save-btn {
		padding: 8px; background: var(--gold); color: #fff;
		border: none; border-radius: 8px; font-size: 13px;
		font-weight: 600; cursor: pointer; font-family: inherit;
	}
	.ex-list { display: flex; flex-direction: column; gap: 4px; }
	.ex-row {
		display: flex; align-items: center; gap: 8px;
		padding: 8px 10px; background: var(--card, #fff);
		border: 1px solid var(--line); border-radius: 10px;
	}
	.ex-name { font-size: 14px; font-weight: 500; flex: 1; }
	.ex-meta { font-size: 12px; color: var(--muted); }
	.del-btn {
		width: 24px; height: 24px; border: none; background: transparent;
		color: var(--muted); font-size: 12px; cursor: pointer; border-radius: 50%;
	}
</style>
