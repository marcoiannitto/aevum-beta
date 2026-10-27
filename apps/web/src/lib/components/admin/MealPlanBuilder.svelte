<script lang="ts">
	import { adminApi, toast } from '$lib/stores/admin';
	import { onMount } from 'svelte';

	let { userId, profile }: {
		userId: number;
		profile: Record<string, unknown>;
	} = $props();

	const PH_FIXED = { loading: 2, transition: 3, stabilization: 18 };
	const PHASE_COLORS: Record<string, string> = {
		loading: '#E8D5E0', activation: '#E8F2EF', transition: '#FFF3CD',
		stabilization: '#D4EDFF', maintenance: 'var(--line-soft)'
	};

	let day = $state(1);
	let meals = $state<Record<string, unknown>[]>([]);
	let rules = $state<Record<string, unknown>[]>([]);
	let recipes = $state<Record<string, unknown>[]>([]);
	let ingredients = $state<Record<string, unknown>[]>([]);
	let catered = $state<Record<string, unknown>[]>([]);
	let plan = $state<Record<number, Record<string, unknown>[]>>({});
	let loading = $state(true);

	// Modal state
	let modalType = $state<'recipe' | 'modular' | 'catered' | null>(null);
	let searchQuery = $state('');

	// Modular meal builder
	let modularItems = $state<{ item: Record<string, unknown>; grams: number }[]>([]);

	// Catered selection
	let cateredSelections = $state<Record<string, Record<string, unknown>>>({});

	// Calendar
	let calMonth = $state(0); // offset from start

	onMount(async () => {
		loading = true;
		try {
			const [rulesRes, recipesRes, ingredientsRes, cateredRes, planRes] = await Promise.all([
				adminApi<{ rows: Record<string, unknown>[] }>('admin_list', { table: 'rules' }),
				adminApi<{ rows: Record<string, unknown>[] }>('admin_list', { table: 'recipes' }),
				adminApi<{ rows: Record<string, unknown>[] }>('admin_mealplan', { sub: 'ingredients' }),
				adminApi<{ rows: Record<string, unknown>[] }>('admin_mealplan', { sub: 'catered' }),
				adminApi<Record<string, unknown>>('admin_mealplan', { sub: 'plan', user_id: userId })
			]);
			rules = rulesRes.rows || [];
			recipes = recipesRes.rows || [];
			ingredients = ingredientsRes.rows || [];
			catered = cateredRes.rows || [];

			// Parse plan into day-keyed map
			const planRows = (planRes.rows || []) as Record<string, unknown>[];
			const p: Record<number, Record<string, unknown>[]> = {};
			for (const r of planRows) {
				const d = r.day as number;
				if (!p[d]) p[d] = [];
				p[d].push(r);
			}
			plan = p;
			meals = plan[day] || [];
		} catch (e: unknown) {
			toast('Error loading meal plan: ' + (e instanceof Error ? e.message : ''), true);
		} finally {
			loading = false;
		}
	});

	function getPhaseForDay(d: number): string {
		const ld = +(profile.loading_days ?? PH_FIXED.loading);
		const ad = +(profile.activation_days ?? 8);
		const td = +(profile.transition_days ?? PH_FIXED.transition);
		const sd = +(profile.stabilization_days ?? PH_FIXED.stabilization);
		if (d <= ld) return 'loading';
		if (d <= ld + ad) return 'activation';
		if (d <= ld + ad + td) return 'transition';
		if (d <= ld + ad + td + sd) return 'stabilization';
		return 'maintenance';
	}

	function getPhaseTargets(phase: string): { kcal: number; protein: number; fat: number; carbs: number } {
		const result = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
		const w = +(profile.start_weight ?? 70);

		// First pass: absolute and per_kg
		for (const r of rules) {
			if (r.phase !== phase) continue;
			const val = +(r.value ?? 0);
			const macro = String(r.macro ?? '').toLowerCase();
			const unit = String(r.unit ?? '');
			if (macro === 'kcal' || macro === 'calories') {
				result.kcal = unit === 'per_kg' ? val * w : val;
			} else if (macro === 'protein') {
				result[macro] = unit === 'per_kg' ? val * w : val;
			} else if (macro === 'fat') {
				result[macro] = unit === 'per_kg' ? val * w : val;
			} else if (macro === 'carbs') {
				result[macro] = unit === 'per_kg' ? val * w : val;
			}
		}

		// Second pass: pct_of_kcal
		for (const r of rules) {
			if (r.phase !== phase) continue;
			const val = +(r.value ?? 0);
			const macro = String(r.macro ?? '').toLowerCase();
			const unit = String(r.unit ?? '');
			if (unit === 'pct_of_kcal' && result.kcal) {
				const grams = (result.kcal * val / 100) / (macro === 'fat' ? 9 : 4);
				if (macro === 'protein') result.protein = grams;
				if (macro === 'fat') result.fat = grams;
				if (macro === 'carbs') result.carbs = grams;
			}
		}

		// Override kcal from profile
		if (profile.current_target_kcal) result.kcal = +(profile.current_target_kcal as number);

		return result;
	}

	function selectDay(d: number) {
		day = d;
		meals = plan[d] || [];
	}

	// Budget calculations
	function mealTotals() {
		let kcal = 0, protein = 0, fat = 0, carbs = 0;
		for (const m of meals) {
			kcal += +(m.kcal ?? 0);
			protein += +(m.protein ?? 0);
			fat += +(m.fat ?? 0);
			carbs += +(m.carbs ?? 0);
		}
		return { kcal, protein, fat, carbs };
	}

	function budgetColor(current: number, target: number): string {
		if (!target) return 'var(--muted)';
		const ratio = current / target;
		if (ratio <= 0.9) return 'var(--green)';
		if (ratio <= 1.05) return 'var(--gold)';
		return 'var(--red)';
	}

	// Calendar grid
	function calendarDays(): number[] {
		const totalDays = +(profile.loading_days ?? 2) + +(profile.activation_days ?? 8) +
			+(profile.transition_days ?? 3) + +(profile.stabilization_days ?? 18) + 14; // +14 for maintenance
		const start = calMonth * 28 + 1;
		const end = Math.min(start + 27, totalDays);
		const days: number[] = [];
		for (let d = start; d <= end; d++) days.push(d);
		return days;
	}

	// Recipe modal
	function filteredRecipes() {
		if (!searchQuery) return recipes.slice(0, 20);
		const q = searchQuery.toLowerCase();
		return recipes.filter(r => String(r.name ?? '').toLowerCase().includes(q)).slice(0, 20);
	}

	function addRecipeMeal(recipe: Record<string, unknown>) {
		const meal: Record<string, unknown> = {
			type: 'recipe', name: recipe.name,
			kcal: +(recipe.kcal ?? 0), protein: +(recipe.protein ?? 0),
			fat: +(recipe.fat ?? 0), carbs: +(recipe.carbs ?? 0),
			recipe_id: recipe.id
		};
		meals = [...meals, meal];
		modalType = null;
		searchQuery = '';
	}

	// Modular modal
	function filteredIngredients() {
		if (!searchQuery) return ingredients.slice(0, 20);
		const q = searchQuery.toLowerCase();
		return ingredients.filter(i => String(i.name ?? '').toLowerCase().includes(q)).slice(0, 20);
	}

	function addModularIngredient(item: Record<string, unknown>) {
		modularItems = [...modularItems, { item, grams: 100 }];
	}

	function removeModularIngredient(idx: number) {
		modularItems = modularItems.filter((_, i) => i !== idx);
	}

	function confirmModularMeal() {
		if (!modularItems.length) return;
		let kcal = 0, protein = 0, fat = 0, carbs = 0;
		const components: Record<string, unknown>[] = [];
		for (const { item, grams } of modularItems) {
			const factor = grams / 100;
			kcal += +(item.kcal ?? 0) * factor;
			protein += +(item.protein ?? 0) * factor;
			fat += +(item.fat ?? 0) * factor;
			carbs += +(item.carbs ?? 0) * factor;
			components.push({ name: item.name, grams });
		}
		meals = [...meals, {
			type: 'modular', name: 'Modular Meal',
			kcal: Math.round(kcal), protein: Math.round(protein),
			fat: Math.round(fat), carbs: Math.round(carbs),
			components_json: JSON.stringify(components)
		}];
		modularItems = [];
		modalType = null;
		searchQuery = '';
	}

	// Catered modal
	function cateredCategories(): string[] {
		const cats = new Set<string>();
		for (const c of catered) cats.add(String(c.category ?? 'Other'));
		return [...cats];
	}

	function cateredByCategory(cat: string) {
		return catered.filter(c => String(c.category ?? 'Other') === cat);
	}

	function selectCatered(cat: string, item: Record<string, unknown>) {
		cateredSelections = { ...cateredSelections, [cat]: item };
	}

	function confirmCateredMeal() {
		const items = Object.values(cateredSelections);
		if (!items.length) return;
		let kcal = 0, protein = 0, fat = 0, carbs = 0;
		for (const item of items) {
			kcal += +(item.per_serving_kcal ?? item.kcal ?? 0);
			protein += +(item.per_serving_protein ?? item.protein ?? 0);
			fat += +(item.per_serving_fat ?? item.fat ?? 0);
			carbs += +(item.per_serving_carbs ?? item.carbs ?? 0);
		}
		meals = [...meals, {
			type: 'catered', name: 'Catered Meal',
			kcal: Math.round(kcal), protein: Math.round(protein),
			fat: Math.round(fat), carbs: Math.round(carbs),
			items_json: JSON.stringify(items.map(i => ({ name: i.name, category: i.category })))
		}];
		cateredSelections = {};
		modalType = null;
	}

	function removeMeal(idx: number) {
		meals = meals.filter((_, i) => i !== idx);
	}

	// Save / Delete / Copy
	async function saveDay() {
		try {
			await adminApi('admin_mealplan', { sub: 'save', user_id: userId, day, rows: meals });
			plan = { ...plan, [day]: [...meals] };
			toast('Day ' + day + ' saved');
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		}
	}

	async function clearDay() {
		if (!confirm('Clear all meals for day ' + day + '?')) return;
		try {
			await adminApi('admin_mealplan', { sub: 'delete', user_id: userId, day });
			meals = [];
			plan = { ...plan, [day]: [] };
			toast('Day ' + day + ' cleared');
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		}
	}

	async function copyDay() {
		const to = prompt('Copy day ' + day + ' to day:');
		if (!to) return;
		try {
			await adminApi('admin_mealplan', { sub: 'copy', user_id: userId, from_day: day, to_day: +to });
			plan = { ...plan, [+to]: [...meals] };
			toast('Copied day ' + day + ' → ' + to);
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		}
	}
</script>

{#if loading}
	<div class="loading-state">Loading meal plan builder...</div>
{:else}
	{@const phase = getPhaseForDay(day)}
	{@const targets = getPhaseTargets(phase)}
	{@const totals = mealTotals()}

	<div class="mp-wrap">
		<!-- Calendar -->
		<div class="mp-calendar">
			<div class="mp-cal-nav">
				<button class="btn-nav" onclick={() => calMonth = Math.max(0, calMonth - 1)} disabled={calMonth === 0}>←</button>
				<span class="cal-label">Days {calMonth * 28 + 1}–{calMonth * 28 + 28}</span>
				<button class="btn-nav" onclick={() => calMonth++}>→</button>
			</div>
			<div class="cal-grid">
				{#each calendarDays() as d}
					<button
						class="cal-day"
						class:active={d === day}
						class:has-meals={!!plan[d]?.length}
						style="background:{d === day ? 'var(--gold)' : PHASE_COLORS[getPhaseForDay(d)] || '#eee'}"
						onclick={() => selectDay(d)}
					>
						{d}
					</button>
				{/each}
			</div>
		</div>

		<!-- Day header -->
		<div class="mp-day-header">
			<h3>Day {day} — <span class="phase-label">{phase}</span></h3>
			<div class="mp-day-actions">
				<button class="btn btn-primary btn-sm" onclick={saveDay}>Save</button>
				<button class="btn btn-outline btn-sm" onclick={copyDay}>Copy to…</button>
				<button class="btn btn-outline btn-sm" onclick={clearDay}>Clear</button>
			</div>
		</div>

		<!-- Budget bars -->
		<div class="mp-budget">
			{#each [['Calories', 'kcal', 'kcal'], ['Protein', 'protein', 'g'], ['Fat', 'fat', 'g'], ['Carbs', 'carbs', 'g']] as [label, key, unit]}
				{@const current = totals[key as keyof typeof totals]}
				{@const target = targets[key as keyof typeof targets]}
				<div class="budget-item">
					<div class="budget-label">{label}</div>
					<div class="budget-bar">
						<div class="budget-fill" style="width:{target ? Math.min(100, (current / target) * 100) : 0}%;background:{budgetColor(current, target)}"></div>
					</div>
					<div class="budget-nums" style="color:{budgetColor(current, target)}">{Math.round(current)} / {Math.round(target)} {unit}</div>
				</div>
			{/each}
		</div>

		<!-- Meals list -->
		<div class="mp-meals">
			{#each meals as meal, idx}
				<div class="meal-card">
					<div class="meal-info">
						<span class="meal-type">{meal.type}</span>
						<span class="meal-name">{meal.name}</span>
					</div>
					<div class="meal-macros">
						<span>{meal.kcal} kcal</span>
						<span>P:{meal.protein}g</span>
						<span>F:{meal.fat}g</span>
						<span>C:{meal.carbs}g</span>
					</div>
					<button class="btn-del" onclick={() => removeMeal(idx)}>×</button>
				</div>
			{/each}
		</div>

		<!-- Add meal buttons -->
		<div class="mp-add-bar">
			<button class="btn btn-outline" onclick={() => { modalType = 'recipe'; searchQuery = ''; }}>+ Recipe</button>
			<button class="btn btn-outline" onclick={() => { modalType = 'modular'; searchQuery = ''; modularItems = []; }}>+ Modular</button>
			<button class="btn btn-outline" onclick={() => { modalType = 'catered'; cateredSelections = {}; }}>+ Catered</button>
		</div>
	</div>

	<!-- Modals -->
	{#if modalType}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal-overlay" onclick={() => modalType = null}>
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div class="modal" onclick={(e) => e.stopPropagation()}>
				{#if modalType === 'recipe'}
					<h3>Add Recipe</h3>
					<input type="text" class="modal-search" bind:value={searchQuery} placeholder="Search recipes..." />
					<div class="modal-list">
						{#each filteredRecipes() as recipe}
							<button class="modal-item" onclick={() => addRecipeMeal(recipe)}>
								<span class="mi-name">{recipe.name}</span>
								<span class="mi-macros">{recipe.kcal} kcal · P:{recipe.protein}g</span>
							</button>
						{/each}
					</div>
				{:else if modalType === 'modular'}
					<h3>Build Modular Meal</h3>
					<input type="text" class="modal-search" bind:value={searchQuery} placeholder="Search ingredients..." />
					<div class="modal-list">
						{#each filteredIngredients() as ing}
							<button class="modal-item" onclick={() => addModularIngredient(ing)}>
								<span class="mi-name">{ing.name}</span>
								<span class="mi-macros">{ing.kcal} kcal/100g</span>
							</button>
						{/each}
					</div>
					{#if modularItems.length}
						<div class="mod-selected">
							<h4>Selected</h4>
							{#each modularItems as mi, idx}
								<div class="mod-row">
									<span>{mi.item.name}</span>
									<input type="number" bind:value={mi.grams} min="1" class="mod-grams" /> g
									<button class="btn-del-sm" onclick={() => removeModularIngredient(idx)}>×</button>
								</div>
							{/each}
							<button class="btn btn-primary btn-sm" onclick={confirmModularMeal}>Add Meal</button>
						</div>
					{/if}
				{:else if modalType === 'catered'}
					<h3>Add Catered Meal</h3>
					<div class="catered-cols">
						{#each cateredCategories() as cat}
							<div class="cat-col">
								<h4>{cat}</h4>
								{#each cateredByCategory(cat) as item}
									<button
										class="cat-item"
										class:selected={cateredSelections[cat]?.id === item.id}
										onclick={() => selectCatered(cat, item)}
									>
										{item.name}
									</button>
								{/each}
							</div>
						{/each}
					</div>
					<button class="btn btn-primary" onclick={confirmCateredMeal} disabled={!Object.keys(cateredSelections).length}>
						Add Catered Meal
					</button>
				{/if}
				<button class="modal-close" onclick={() => modalType = null}>×</button>
			</div>
		</div>
	{/if}
{/if}

<style>
	.loading-state { color: var(--muted); padding: 40px; text-align: center; }
	.mp-wrap { padding: 20px 28px; display: flex; flex-direction: column; gap: 16px; }

	/* Calendar */
	.mp-calendar { background: var(--card); border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
	.mp-cal-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
	.btn-nav { background: none; border: 1px solid var(--line); border-radius: 6px; padding: 4px 12px; cursor: pointer; font-size: 14px; }
	.btn-nav:disabled { opacity: .3; cursor: default; }
	.cal-label { font-size: 13px; font-weight: 500; }
	.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
	.cal-day { width: 100%; aspect-ratio: 1; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; position: relative; transition: transform .1s; }
	.cal-day:hover { transform: scale(1.1); }
	.cal-day.active { color: #fff; font-weight: 700; }
	.cal-day.has-meals::after { content: ''; position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%); width: 5px; height: 5px; border-radius: 50%; background: var(--gold); }

	/* Day header */
	.mp-day-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
	.mp-day-header h3 { font-family: var(--serif); font-size: 16px; }
	.phase-label { text-transform: capitalize; color: var(--muted); }
	.mp-day-actions { display: flex; gap: 6px; }

	/* Budget */
	.mp-budget { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
	.budget-item { background: var(--card); border-radius: 10px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
	.budget-label { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin-bottom: 6px; }
	.budget-bar { height: 6px; background: var(--line-soft); border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
	.budget-fill { height: 100%; border-radius: 3px; transition: width .3s; }
	.budget-nums { font-size: 12px; font-weight: 500; }

	/* Meals */
	.mp-meals { display: flex; flex-direction: column; gap: 8px; }
	.meal-card { display: flex; align-items: center; gap: 12px; background: var(--card); border-radius: 10px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
	.meal-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
	.meal-type { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
	.meal-name { font-size: 14px; font-weight: 500; }
	.meal-macros { display: flex; gap: 10px; font-size: 12px; color: var(--ink-soft); }
	.btn-del { background: none; border: none; color: var(--red); font-size: 18px; cursor: pointer; opacity: .5; }
	.btn-del:hover { opacity: 1; }
	.mp-add-bar { display: flex; gap: 8px; }

	/* Modal */
	.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 100; display: flex; align-items: center; justify-content: center; }
	.modal { background: var(--paper); border-radius: 16px; padding: 24px; width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto; position: relative; }
	.modal h3 { font-family: var(--serif); font-size: 18px; margin-bottom: 14px; }
	.modal-search { width: 100%; padding: 10px 14px; border: 1px solid var(--line); border-radius: 8px; font-size: 14px; margin-bottom: 12px; }
	.modal-search:focus { border-color: var(--gold); outline: none; }
	.modal-list { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
	.modal-item { display: flex; justify-content: space-between; padding: 10px 12px; border-radius: 8px; cursor: pointer; border: none; background: var(--card); text-align: left; width: 100%; }
	.modal-item:hover { background: #f5f0e5; }
	.mi-name { font-size: 13px; }
	.mi-macros { font-size: 12px; color: var(--muted); }
	.modal-close { position: absolute; top: 14px; right: 14px; background: none; border: none; font-size: 22px; cursor: pointer; color: var(--muted); }

	/* Modular */
	.mod-selected { border-top: 1px solid var(--line); margin-top: 12px; padding-top: 12px; }
	.mod-selected h4 { font-size: 13px; margin-bottom: 8px; }
	.mod-row { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 6px; }
	.mod-grams { width: 60px; padding: 4px 6px; border: 1px solid var(--line); border-radius: 4px; text-align: right; }
	.btn-del-sm { background: none; border: none; color: var(--red); cursor: pointer; font-size: 14px; }

	/* Catered */
	.catered-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 14px; }
	.cat-col h4 { font-size: 12px; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
	.cat-item { display: block; width: 100%; padding: 8px 10px; border: 1px solid var(--line); border-radius: 6px; cursor: pointer; font-size: 12px; margin-bottom: 4px; background: var(--card); text-align: left; }
	.cat-item.selected { border-color: var(--gold); background: #faf5e8; }

	.btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; }
	.btn-sm { padding: 5px 10px; font-size: 12px; }
	.btn-primary { background: var(--gold); color: var(--ink); }
	.btn-primary:disabled { opacity: .4; cursor: default; }
	.btn-outline { border: 1px solid var(--line); color: var(--ink-soft); background: transparent; }
	.btn:hover:not(:disabled) { opacity: .85; }

	@media (max-width: 600px) { .mp-budget { grid-template-columns: 1fr 1fr; } }
</style>
