<!--
  Food Quantity Calculator — admin tool.
  Migrated from calculator.html. Auth via admin token, loads clients + ingredients from API.
  Auto-computes gram portions to hit macro targets per meal.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { BACKEND_URL } from '$lib/api/client';

	// ── Types ──
	interface Ingredient {
		id: string;
		name: string;
		category: string;
		per_100g_kcal: number;
		per_100g_p: number;
		per_100g_f: number;
		per_100g_c: number;
	}

	interface BasketItem {
		food: Ingredient;
		grams: number;
	}

	interface Macros {
		kcal: number;
		protein: number;
		fat: number;
		carbs: number;
	}

	interface User {
		id: string;
		name?: string;
		email?: string;
		program?: boolean;
	}

	// ── State ──
	let token = $state('');
	let loggedIn = $state(false);
	let loginErr = $state('');

	let allUsers = $state<User[]>([]);
	let ingredients = $state<Ingredient[]>([]);
	let selectedClientId = $state('');
	let selectedProfile = $state<Record<string, unknown> | null>(null);

	// Inputs
	let inputWeight = $state(0);
	let inputKcal = $state(700);
	let inputProteinPerKg = $state(1.3);
	let inputFat = $state(15);
	let inputCarbs = $state(30);
	let suppKcal = $state(0);
	let suppP = $state(0);
	let suppF = $state(0);
	let suppC = $state(0);

	// Meal baskets
	let meal1 = $state<Record<string, BasketItem>>({});
	let meal2 = $state<Record<string, BasketItem>>({});
	const mealSplit = 0.5;

	// Search
	let search1 = $state('');
	let search2 = $state('');

	// Active tab
	type MealTab = 1 | 2 | 'summary' | 'portions';
	let activeTab = $state<MealTab>(1);

	// ── API helper ──
	async function api(action: string, data: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
		const res = await fetch(BACKEND_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
			body: JSON.stringify({ action, ...data })
		});
		const json = await res.json();
		if (json.error) throw new Error(json.error);
		return json;
	}

	// ── Login ──
	async function doLogin() {
		if (!token.trim()) { loginErr = 'Enter your admin token'; return; }
		try {
			await api('admin_users');
			sessionStorage.setItem('aevum_calc_token', token);
			loggedIn = true;
			loadData();
		} catch {
			loginErr = 'Invalid token or not admin';
			token = '';
		}
	}

	function handleLoginKey(e: KeyboardEvent) {
		if (e.key === 'Enter') doLogin();
	}

	// ── Data loading ──
	async function loadData() {
		try {
			const [usersRes, ingRes] = await Promise.all([
				api('admin_users'),
				api('admin_list', { table: 'ingredients' })
			]);
			allUsers = (usersRes.users as User[]) || [];
			ingredients = ((ingRes.rows as Ingredient[]) || []).sort((a, b) => a.name.localeCompare(b.name));
		} catch (e) {
			console.error('Load error:', e);
		}
	}

	// ── Client change ──
	async function onClientChange() {
		if (!selectedClientId) { selectedProfile = null; return; }
		try {
			const res = await api('admin_export', { id: selectedClientId });
			selectedProfile = (res.profile as Record<string, unknown>) || {};
			const w = parseFloat(String(selectedProfile.start_weight)) || parseFloat(String(selectedProfile.weight)) || parseFloat(String(selectedProfile.current_weight)) || 0;
			if (w > 0) inputWeight = w;
			if (selectedProfile.current_target_kcal) inputKcal = Number(selectedProfile.current_target_kcal);
		} catch (e) {
			console.error('Profile load error:', e);
		}
	}

	// ── Derived targets ──
	const totalProtein = $derived(inputWeight * inputProteinPerKg);
	const suppTotal = $derived({ kcal: suppKcal * 2, protein: suppP * 2, fat: suppF * 2, carbs: suppC * 2 });
	const daily = $derived({ kcal: inputKcal, protein: totalProtein, fat: inputFat, carbs: inputCarbs });
	const net = $derived({
		kcal: daily.kcal - suppTotal.kcal,
		protein: daily.protein - suppTotal.protein,
		fat: daily.fat - suppTotal.fat,
		carbs: daily.carbs - suppTotal.carbs
	});

	const m1budget = $derived({
		kcal: net.kcal * mealSplit,
		protein: net.protein * mealSplit,
		fat: net.fat * mealSplit,
		carbs: net.carbs * mealSplit
	});

	// ── Categorise ingredients by search ──
	function categorise(ings: Ingredient[], q: string) {
		const query = q.toLowerCase();
		const cats: Record<string, Ingredient[]> = { protein: [], vegetable: [], fruit: [], other: [] };
		ings.forEach(ing => {
			if (query && !ing.name.toLowerCase().includes(query)) return;
			const cat = (ing.category || '').toLowerCase();
			if (cats[cat]) cats[cat].push(ing);
			else cats.other.push(ing);
		});
		return cats;
	}

	// ── Auto-compute grams ──
	function autoCompute(basket: Record<string, BasketItem>, budget: Macros) {
		const items = Object.values(basket);
		if (!items.length) return;

		const proteins = items.filter(i => (i.food.category || '').toLowerCase() === 'protein');
		const vegs = items.filter(i => (i.food.category || '').toLowerCase() === 'vegetable');
		const fruits = items.filter(i => (i.food.category || '').toLowerCase() === 'fruit');
		const others = items.filter(i => !['protein', 'vegetable', 'fruit'].includes((i.food.category || '').toLowerCase()));

		// Size proteins to hit protein target
		if (proteins.length) {
			const share = budget.protein / proteins.length;
			proteins.forEach(item => {
				const p100 = item.food.per_100g_p || 0;
				item.grams = p100 > 0 ? Math.round((share / p100) * 100) : 0;
			});
		}

		let usedCarbs = 0;
		proteins.forEach(item => { usedCarbs += (item.food.per_100g_c || 0) * item.grams / 100; });
		let remainingCarbs = budget.carbs - usedCarbs;

		// Size vegetables
		if (vegs.length && remainingCarbs > 0) {
			const vegShare = (remainingCarbs * 0.7) / vegs.length;
			vegs.forEach(item => {
				const c100 = item.food.per_100g_c || 0;
				item.grams = c100 > 0 ? Math.round((vegShare / c100) * 100) : 100;
			});
			vegs.forEach(item => { usedCarbs += (item.food.per_100g_c || 0) * item.grams / 100; });
			remainingCarbs = budget.carbs - usedCarbs;
		}

		// Size fruits
		if (fruits.length && remainingCarbs > 0) {
			const fruitShare = remainingCarbs / fruits.length;
			fruits.forEach(item => {
				const c100 = item.food.per_100g_c || 0;
				item.grams = c100 > 0 ? Math.round((fruitShare / c100) * 100) : 50;
			});
		}

		others.forEach(item => { if (!item.grams) item.grams = 50; });
		items.forEach(item => { if (item.grams < 0) item.grams = 0; });
	}

	// ── Meal totals ──
	function mealTotals(basket: Record<string, BasketItem>): Macros {
		let kcal = 0, protein = 0, fat = 0, carbs = 0;
		Object.values(basket).forEach(item => {
			const g = item.grams || 0;
			kcal += (item.food.per_100g_kcal || 0) * g / 100;
			protein += (item.food.per_100g_p || 0) * g / 100;
			fat += (item.food.per_100g_f || 0) * g / 100;
			carbs += (item.food.per_100g_c || 0) * g / 100;
		});
		return { kcal: Math.round(kcal), protein: +protein.toFixed(1), fat: +fat.toFixed(1), carbs: +carbs.toFixed(1) };
	}

	// ── Recalculate ──
	function recalc() {
		if (!inputWeight) return;
		autoCompute(meal1, m1budget);
		const m1t = mealTotals(meal1);
		const m2b = {
			kcal: net.kcal - m1t.kcal,
			protein: net.protein - m1t.protein,
			fat: net.fat - m1t.fat,
			carbs: net.carbs - m1t.carbs
		};
		autoCompute(meal2, m2b);
		// Force reactivity
		meal1 = { ...meal1 };
		meal2 = { ...meal2 };
	}

	// Derived totals (recompute on basket changes)
	const m1totals = $derived(mealTotals(meal1));
	const m2totals = $derived(mealTotals(meal2));
	const m2budget = $derived({
		kcal: net.kcal - m1totals.kcal,
		protein: net.protein - m1totals.protein,
		fat: net.fat - m1totals.fat,
		carbs: net.carbs - m1totals.carbs
	});

	// ── Toggle ingredient ──
	function toggleIngredient(id: string, mealNum: 1 | 2) {
		const basket = mealNum === 1 ? meal1 : meal2;
		if (basket[id]) {
			delete basket[id];
		} else {
			const food = ingredients.find(i => i.id === id);
			if (!food) return;
			basket[id] = { food, grams: 0 };
		}
		if (mealNum === 1) meal1 = { ...basket }; else meal2 = { ...basket };
		recalc();
	}

	function removeIngredient(id: string, mealNum: 1 | 2) {
		const basket = mealNum === 1 ? meal1 : meal2;
		delete basket[id];
		if (mealNum === 1) meal1 = { ...basket }; else meal2 = { ...basket };
		recalc();
	}

	function updateGrams(id: string, mealNum: 1 | 2, val: string) {
		const basket = mealNum === 1 ? meal1 : meal2;
		if (basket[id]) basket[id].grams = parseFloat(val) || 0;
		if (mealNum === 1) meal1 = { ...basket }; else meal2 = { ...basket };
	}

	// ── Warnings ──
	function warnings(totals: Macros, budget: Macros): string[] {
		const w: string[] = [];
		if (totals.fat > budget.fat * 1.1) w.push('Fat exceeds budget. Consider swapping to a leaner protein.');
		if (totals.carbs > budget.carbs * 1.1) w.push('Carbs exceed budget. Reduce vegetable or fruit portion.');
		if (totals.kcal > budget.kcal * 1.1) w.push('Calories exceed budget.');
		return w;
	}

	const m1warnings = $derived(warnings(m1totals, m1budget));
	const m2warnings = $derived(warnings(m2totals, m2budget));

	// ── Budget bar helpers ──
	function pct(used: number, total: number): number {
		return total > 0 ? Math.min((used / total) * 100, 100) : 0;
	}

	function barCls(used: number, total: number): string {
		const p = total > 0 ? (used / total) * 100 : 0;
		return p > 100 ? 'over' : p > 85 ? 'warn' : 'ok';
	}

	// ── Portions reference ──
	const proteinSources = $derived(ingredients.filter(i => (i.category || '').toLowerCase() === 'protein'));
	const mealProteinTarget = $derived(net.protein * mealSplit);
	const mealFatTarget = $derived(net.fat * mealSplit);
	const mealKcalTarget = $derived(net.kcal * mealSplit);

	// ── Summary rows ──
	const summaryRows = $derived([
		{ key: 'kcal', label: 'Kcal', target: daily.kcal, supp: suppTotal.kcal, m1: m1totals.kcal, m2: m2totals.kcal },
		{ key: 'protein', label: 'Protein (g)', target: daily.protein, supp: suppTotal.protein, m1: m1totals.protein, m2: m2totals.protein },
		{ key: 'fat', label: 'Fat (g)', target: daily.fat, supp: suppTotal.fat, m1: m1totals.fat, m2: m2totals.fat },
		{ key: 'carbs', label: 'Carbs (g)', target: daily.carbs, supp: suppTotal.carbs, m1: m1totals.carbs, m2: m2totals.carbs }
	].map(r => {
		const total = r.supp + r.m1 + r.m2;
		const delta = total - r.target;
		const abs = Math.abs(delta);
		let cls = 'delta-ok';
		if (r.key === 'kcal' && abs > 50) cls = abs > 100 ? 'delta-over' : 'delta-warn';
		if (r.key !== 'kcal' && abs > 5) cls = abs > 10 ? 'delta-over' : 'delta-warn';
		return { ...r, total, delta, cls };
	}));

	// ── Reset ──
	function resetAll() {
		meal1 = {};
		meal2 = {};
		selectedClientId = '';
		inputWeight = 0;
		inputKcal = 700;
		inputProteinPerKg = 1.3;
		inputFat = 15;
		inputCarbs = 30;
		suppKcal = 0;
		suppP = 0;
		suppF = 0;
		suppC = 0;
		selectedProfile = null;
		activeTab = 1;
	}

	// ── Users split ──
	const programUsers = $derived(allUsers.filter(u => u.program));
	const inactiveUsers = $derived(allUsers.filter(u => !u.program));

	// ── Init ──
	onMount(() => {
		const saved = sessionStorage.getItem('aevum_calc_token');
		if (saved) {
			token = saved;
			api('admin_users').then(() => {
				loggedIn = true;
				loadData();
			}).catch(() => {
				token = '';
				sessionStorage.removeItem('aevum_calc_token');
			});
		}
	});
</script>

<svelte:head>
	<title>AEVUM Food Calculator</title>
</svelte:head>

<!-- LOGIN -->
{#if !loggedIn}
	<div class="login-screen">
		<div class="brand">AEVUM</div>
		<div class="brand-sub">FOOD CALCULATOR</div>
		<div class="login-box">
			<input type="text" placeholder="Admin token" autocomplete="off" bind:value={token} onkeydown={handleLoginKey} />
			<button class="btn-login" onclick={doLogin}>Enter</button>
			<div class="login-err">{loginErr}</div>
		</div>
	</div>
{:else}
	<!-- APP -->
	<div class="calc-app">
		<div class="topbar">
			<div class="topbar-left">
				<h1>Food Calculator</h1>
				<span class="ver">v1.0.0</span>
			</div>
			<div class="topbar-right">
				<button class="btn btn-outline" onclick={resetAll}>Reset</button>
			</div>
		</div>

		<!-- STEP 1: Client + Setup -->
		<div class="card">
			<h2>1. Client Setup</h2>
			<div class="fg">
				<label>Client
					<select bind:value={selectedClientId} onchange={onClientChange}>
						<option value="">Select client...</option>
						{#each programUsers as u}
							<option value={u.id}>{u.name || u.email || u.id}</option>
						{/each}
						{#if inactiveUsers.length}
							<option disabled>───────────</option>
							{#each inactiveUsers as u}
								<option value={u.id}>{u.name || u.email || u.id} (inactive)</option>
							{/each}
						{/if}
					</select>
				</label>
				<label>Body weight (kg)
					<input type="number" step="0.1" min="30" max="300" bind:value={inputWeight} onchange={recalc} />
				</label>
			</div>

			<h3>Daily Targets</h3>
			<div class="fg">
				<label>Kcal/day <input type="number" step="50" min="200" max="2000" bind:value={inputKcal} onchange={recalc} /></label>
				<label>Protein (g/kg BW) <input type="number" step="0.1" min="0.5" max="3" bind:value={inputProteinPerKg} onchange={recalc} /></label>
				<label>Fat (g/day) <input type="number" step="1" min="0" max="100" bind:value={inputFat} onchange={recalc} /></label>
				<label>Carbs (g/day) <input type="number" step="1" min="0" max="200" bind:value={inputCarbs} onchange={recalc} /></label>
			</div>

			<h3>Supplement (per serve, 2x/day)</h3>
			<div class="fg">
				<label>Kcal <input type="number" step="1" min="0" bind:value={suppKcal} onchange={recalc} /></label>
				<label>Protein (g) <input type="number" step="0.1" min="0" bind:value={suppP} onchange={recalc} /></label>
				<label>Fat (g) <input type="number" step="0.1" min="0" bind:value={suppF} onchange={recalc} /></label>
				<label>Carbs (g) <input type="number" step="0.1" min="0" bind:value={suppC} onchange={recalc} /></label>
			</div>
		</div>

		<!-- Net food targets -->
		<div class="card">
			<h2>Net Food Targets (after supplements)</h2>
			<div class="budget-row">
				{#each [
					{ label: 'Kcal', used: 0, total: net.kcal, unit: '' },
					{ label: 'Protein', used: 0, total: net.protein, unit: 'g' },
					{ label: 'Fat', used: 0, total: net.fat, unit: 'g' },
					{ label: 'Carbs', used: 0, total: net.carbs, unit: 'g' }
				] as b}
					<div class="budget-item">
						<div class="budget-label"><span>{b.label}</span><span>{Math.round(b.total)}{b.unit}</span></div>
						<div class="budget-bar"><div class="budget-fill ok" style="width:100%"></div></div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Meal tabs -->
		<div class="tabs">
			<button class="tab" class:active={activeTab === 1} onclick={() => activeTab = 1}>Meal 1</button>
			<button class="tab" class:active={activeTab === 2} onclick={() => activeTab = 2}>Meal 2</button>
			<button class="tab" class:active={activeTab === 'summary'} onclick={() => activeTab = 'summary'}>Summary</button>
			<button class="tab" class:active={activeTab === 'portions'} onclick={() => activeTab = 'portions'}>Portions</button>
		</div>

		<!-- MEAL 1 -->
		{#if activeTab === 1}
			<div class="card">
				<div class="card-head">
					<h2>Meal 1 Basket</h2>
					<span class="split-label">~50% of daily food</span>
				</div>
				<div class="budget-row">
					{#each [
						{ label: 'Kcal', used: m1totals.kcal, total: m1budget.kcal, unit: '' },
						{ label: 'Protein', used: m1totals.protein, total: m1budget.protein, unit: 'g' },
						{ label: 'Fat', used: m1totals.fat, total: m1budget.fat, unit: 'g' },
						{ label: 'Carbs', used: m1totals.carbs, total: m1budget.carbs, unit: 'g' }
					] as b}
						<div class="budget-item">
							<div class="budget-label"><span>{b.label}</span><span>{Math.round(b.used)}/{Math.round(b.total)}{b.unit}</span></div>
							<div class="budget-bar"><div class="budget-fill {barCls(b.used, b.total)}" style="width:{pct(b.used, b.total)}%"></div></div>
						</div>
					{/each}
				</div>

				<!-- Ingredient picker -->
				<input class="ing-search" type="text" placeholder="Search ingredients..." bind:value={search1} />
				{#each ['protein', 'vegetable', 'fruit', 'other'] as cat}
					{@const items = categorise(ingredients, search1)[cat]}
					{#if items.length}
						<div class="cat-section">
							<div class="cat-label">{cat}s</div>
							<div class="ing-grid">
								{#each items as ing}
									<button class="ing-chip" class:selected={!!meal1[ing.id]} onclick={() => toggleIngredient(ing.id, 1)}>{ing.name}</button>
								{/each}
							</div>
						</div>
					{/if}
				{/each}

				<!-- Basket table -->
				{#if Object.keys(meal1).length}
					<table class="basket-table">
						<thead><tr><th>Ingredient</th><th class="num">Grams</th><th class="num">Kcal</th><th class="num">P</th><th class="num">F</th><th class="num">C</th><th></th></tr></thead>
						<tbody>
							{#each Object.entries(meal1) as [id, item]}
								{@const g = item.grams || 0}
								{@const kcal = Math.round((item.food.per_100g_kcal || 0) * g / 100)}
								{@const p = +((item.food.per_100g_p || 0) * g / 100).toFixed(1)}
								{@const f = +((item.food.per_100g_f || 0) * g / 100).toFixed(1)}
								{@const c = +((item.food.per_100g_c || 0) * g / 100).toFixed(1)}
								<tr>
									<td>{item.food.name}</td>
									<td class="num"><input type="number" value={g} min="0" step="5" onchange={(e) => updateGrams(id, 1, (e.target as HTMLInputElement).value)} /></td>
									<td class="num">{kcal}</td>
									<td class="num">{p}g</td>
									<td class="num">{f}g</td>
									<td class="num">{c}g</td>
									<td><button class="remove-btn" onclick={() => removeIngredient(id, 1)}>&times;</button></td>
								</tr>
							{/each}
							<tr class="total-row">
								<td>Total</td><td></td>
								<td class="num">{m1totals.kcal}</td>
								<td class="num">{m1totals.protein.toFixed(1)}g</td>
								<td class="num">{m1totals.fat.toFixed(1)}g</td>
								<td class="num">{m1totals.carbs.toFixed(1)}g</td>
								<td></td>
							</tr>
						</tbody>
					</table>
				{:else}
					<p class="pick-hint">Pick ingredients above</p>
				{/if}

				{#each m1warnings as w}
					<div class="warning">{w}</div>
				{/each}
			</div>
		{/if}

		<!-- MEAL 2 -->
		{#if activeTab === 2}
			<div class="card">
				<div class="card-head">
					<h2>Meal 2 Basket</h2>
					<span class="split-label">Remaining budget</span>
				</div>
				<div class="budget-row">
					{#each [
						{ label: 'Kcal', used: m2totals.kcal, total: m2budget.kcal, unit: '' },
						{ label: 'Protein', used: m2totals.protein, total: m2budget.protein, unit: 'g' },
						{ label: 'Fat', used: m2totals.fat, total: m2budget.fat, unit: 'g' },
						{ label: 'Carbs', used: m2totals.carbs, total: m2budget.carbs, unit: 'g' }
					] as b}
						<div class="budget-item">
							<div class="budget-label"><span>{b.label}</span><span>{Math.round(b.used)}/{Math.round(b.total)}{b.unit}</span></div>
							<div class="budget-bar"><div class="budget-fill {barCls(b.used, b.total)}" style="width:{pct(b.used, b.total)}%"></div></div>
						</div>
					{/each}
				</div>

				<input class="ing-search" type="text" placeholder="Search ingredients..." bind:value={search2} />
				{#each ['protein', 'vegetable', 'fruit', 'other'] as cat}
					{@const items = categorise(ingredients, search2)[cat]}
					{#if items.length}
						<div class="cat-section">
							<div class="cat-label">{cat}s</div>
							<div class="ing-grid">
								{#each items as ing}
									<button class="ing-chip" class:selected={!!meal2[ing.id]} onclick={() => toggleIngredient(ing.id, 2)}>{ing.name}</button>
								{/each}
							</div>
						</div>
					{/if}
				{/each}

				{#if Object.keys(meal2).length}
					<table class="basket-table">
						<thead><tr><th>Ingredient</th><th class="num">Grams</th><th class="num">Kcal</th><th class="num">P</th><th class="num">F</th><th class="num">C</th><th></th></tr></thead>
						<tbody>
							{#each Object.entries(meal2) as [id, item]}
								{@const g = item.grams || 0}
								{@const kcal = Math.round((item.food.per_100g_kcal || 0) * g / 100)}
								{@const p = +((item.food.per_100g_p || 0) * g / 100).toFixed(1)}
								{@const f = +((item.food.per_100g_f || 0) * g / 100).toFixed(1)}
								{@const c = +((item.food.per_100g_c || 0) * g / 100).toFixed(1)}
								<tr>
									<td>{item.food.name}</td>
									<td class="num"><input type="number" value={g} min="0" step="5" onchange={(e) => updateGrams(id, 2, (e.target as HTMLInputElement).value)} /></td>
									<td class="num">{kcal}</td>
									<td class="num">{p}g</td>
									<td class="num">{f}g</td>
									<td class="num">{c}g</td>
									<td><button class="remove-btn" onclick={() => removeIngredient(id, 2)}>&times;</button></td>
								</tr>
							{/each}
							<tr class="total-row">
								<td>Total</td><td></td>
								<td class="num">{m2totals.kcal}</td>
								<td class="num">{m2totals.protein.toFixed(1)}g</td>
								<td class="num">{m2totals.fat.toFixed(1)}g</td>
								<td class="num">{m2totals.carbs.toFixed(1)}g</td>
								<td></td>
							</tr>
						</tbody>
					</table>
				{:else}
					<p class="pick-hint">Pick ingredients above</p>
				{/if}

				{#each m2warnings as w}
					<div class="warning">{w}</div>
				{/each}
			</div>
		{/if}

		<!-- SUMMARY -->
		{#if activeTab === 'summary'}
			<div class="card">
				<h2>Daily Summary</h2>
				<table class="summary-table">
					<thead><tr><th></th><th>Target</th><th>Suppl.</th><th>Meal 1</th><th>Meal 2</th><th>Total</th><th>Delta</th></tr></thead>
					<tbody>
						{#each summaryRows as r}
							<tr>
								<td class="row-label">{r.label}</td>
								<td class="num">{Math.round(r.target)}</td>
								<td class="num">{Math.round(r.supp)}</td>
								<td class="num">{Math.round(r.m1)}</td>
								<td class="num">{Math.round(r.m2)}</td>
								<td class="num bold">{Math.round(r.total)}</td>
								<td class="num {r.cls}">{r.delta >= 0 ? '+' : ''}{Math.round(r.delta)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<!-- PORTIONS REFERENCE -->
		{#if activeTab === 'portions'}
			<div class="card">
				<h2>Protein Portions per Meal</h2>
				<p class="portions-note">Grams needed if this is the only protein source in a meal (50% split). Based on current targets.</p>
				{#if !inputWeight}
					<p class="pick-hint">Set body weight first.</p>
				{:else if !proteinSources.length}
					<p class="pick-hint">No protein ingredients loaded.</p>
				{:else}
					<table class="ref-table">
						<thead><tr><th>Protein Source</th><th class="num">Grams/meal</th><th class="num">Kcal</th><th class="num">P (g)</th><th class="num">F (g)</th><th class="num">C (g)</th><th class="num">Notes</th></tr></thead>
						<tbody>
							{#each proteinSources as food}
								{@const p100 = food.per_100g_p || 0}
								{#if p100 > 0}
									{@const grams = Math.round((mealProteinTarget / p100) * 100)}
									{@const kcal = Math.round((food.per_100g_kcal || 0) * grams / 100)}
									{@const fat = +((food.per_100g_f || 0) * grams / 100).toFixed(1)}
									{@const carbs = +((food.per_100g_c || 0) * grams / 100).toFixed(1)}
									{@const prot = +((food.per_100g_p || 0) * grams / 100).toFixed(1)}
									<tr>
										<td>{food.name}</td>
										<td class="num bold">{grams}g</td>
										<td class="num">{kcal}</td>
										<td class="num">{prot}</td>
										<td class="num">{fat}</td>
										<td class="num">{carbs}</td>
										<td class="num">
											{#if fat > mealFatTarget}
												<span class="note-red">fat over budget</span>
											{:else if kcal > mealKcalTarget * 0.8}
												<span class="note-warn">high kcal</span>
											{/if}
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
					<p class="portions-footnote">Meal protein target: {mealProteinTarget.toFixed(1)}g ({net.protein.toFixed(1)}g daily, 50/50 split)</p>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	/* LOGIN */
	.login-screen {
		position: fixed; inset: 0; background: var(--ink, #1A1A1A); color: #fff;
		z-index: 200; display: flex; flex-direction: column;
		align-items: center; justify-content: center;
		padding: 32px 28px; text-align: center;
	}
	.brand { font-family: var(--serif); font-size: 34px; font-weight: 500; letter-spacing: .16em; }
	.brand-sub { color: var(--gold); font-size: 11px; letter-spacing: .28em; margin-top: 6px; }
	.login-box { margin-top: 48px; width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 14px; }
	.login-box input {
		width: 100%; padding: 14px; background: #242320; border: 1px solid #34322d;
		border-radius: 12px; color: #fff; font-size: 15px; text-align: center;
		letter-spacing: .04em; font-family: inherit;
	}
	.login-box input::placeholder { color: #6b665c; }
	.btn-login {
		padding: 14px; background: var(--gold); color: var(--ink);
		border-radius: 12px; font-size: 15px; font-weight: 600;
		border: none; cursor: pointer; font-family: inherit;
	}
	.btn-login:hover { opacity: .9; }
	.login-err { color: #e05c4d; font-size: 13px; min-height: 20px; }

	/* LAYOUT */
	.calc-app { max-width: 900px; margin: 0 auto; padding: 16px; }
	.topbar {
		display: flex; align-items: center; justify-content: space-between;
		padding: 12px 0; margin-bottom: 16px; border-bottom: 1px solid var(--line);
	}
	.topbar-left { display: flex; align-items: baseline; gap: 8px; }
	.topbar-left h1 { font-family: var(--serif); font-size: 20px; font-weight: 500; margin: 0; }
	.topbar-right { display: flex; gap: 8px; }
	.ver { font-size: 11px; color: var(--muted); }
	.btn {
		padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500;
		cursor: pointer; border: none; font-family: inherit;
	}
	.btn-outline { border: 1px solid var(--line); color: var(--ink-soft, #4a463f); background: transparent; }
	.btn:hover { opacity: .85; }

	/* CARD */
	.card {
		background: #fff; border-radius: 12px; padding: 20px;
		box-shadow: 0 1px 3px rgba(0,0,0,.06); margin-bottom: 16px;
	}
	.card h2 { font-family: var(--serif); font-size: 16px; font-weight: 500; margin: 0 0 14px; }
	.card h3 { font-family: var(--serif); font-size: 14px; font-weight: 500; margin: 14px 0 10px; color: var(--ink-soft, #4a463f); }
	.card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
	.card-head h2 { margin-bottom: 0; }
	.split-label { font-size: 12px; color: var(--muted); }

	/* FORM GRID */
	.fg { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 14px; }
	.fg label {
		font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
		color: var(--muted); display: flex; flex-direction: column; gap: 4px;
	}
	.fg input, .fg select {
		padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px;
		background: #fff; font-size: 13px; color: var(--ink); font-family: inherit;
	}
	.fg input:focus, .fg select:focus { border-color: var(--gold); outline: none; }

	/* INGREDIENT PICKER */
	.ing-search {
		width: 100%; padding: 10px 12px; border: 1px solid var(--line);
		border-radius: 10px; font-size: 13px; background: #fff;
		margin-bottom: 12px; font-family: inherit;
	}
	.ing-search:focus { border-color: var(--gold); outline: none; }
	.cat-section { margin-bottom: 14px; }
	.cat-label { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin-bottom: 6px; font-weight: 600; }
	.ing-grid { display: flex; flex-wrap: wrap; gap: 6px; }
	.ing-chip {
		padding: 6px 12px; border: 1px solid var(--line); border-radius: 20px;
		font-size: 12px; cursor: pointer; user-select: none;
		background: #fff; font-family: inherit;
	}
	.ing-chip:hover { border-color: var(--gold); background: #faf6ee; }
	.ing-chip.selected { background: var(--gold); color: #fff; border-color: var(--gold); }

	/* BASKET TABLE */
	.basket-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
	.basket-table th {
		text-align: left; padding: 6px 8px; font-size: 11px;
		text-transform: uppercase; letter-spacing: .04em;
		color: var(--muted); border-bottom: 2px solid var(--line);
	}
	.basket-table td { padding: 6px 8px; border-bottom: 1px solid var(--line-soft, #F2EDE2); font-size: 13px; }
	.basket-table .num { text-align: right; font-variant-numeric: tabular-nums; }
	.basket-table .total-row td { font-weight: 600; border-top: 2px solid var(--line); border-bottom: none; }
	.basket-table input[type="number"] {
		width: 60px; padding: 4px 6px; border: 1px solid var(--line);
		border-radius: 6px; text-align: right; font-size: 13px; font-family: inherit;
	}
	.basket-table input[type="number"]:focus { border-color: var(--gold); outline: none; }
	.remove-btn { color: var(--red, #A13024); font-size: 16px; cursor: pointer; opacity: .5; padding: 2px 6px; background: none; border: none; }
	.remove-btn:hover { opacity: 1; }
	.pick-hint { color: var(--muted); font-size: 13px; margin-top: 8px; }

	/* BUDGET BARS */
	.budget-row { display: flex; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
	.budget-item { flex: 1; min-width: 100px; }
	.budget-label { font-size: 11px; color: var(--muted); margin-bottom: 3px; display: flex; justify-content: space-between; }
	.budget-bar { height: 8px; background: var(--line-soft, #F2EDE2); border-radius: 4px; overflow: hidden; }
	.budget-fill { height: 100%; border-radius: 4px; transition: width .2s; }
	.budget-fill.ok { background: var(--green, #2d6a4f); }
	.budget-fill.warn { background: #c4880d; }
	.budget-fill.over { background: var(--red, #A13024); }

	/* TABS */
	.tabs { display: flex; gap: 0; border-bottom: 2px solid var(--line); margin-bottom: 16px; }
	.tab {
		padding: 8px 20px; font-size: 13px; font-weight: 500;
		color: var(--muted); cursor: pointer; background: none;
		border: none; border-bottom: 2px solid transparent;
		margin-bottom: -2px; font-family: inherit;
	}
	.tab:hover { color: var(--ink); }
	.tab.active { color: var(--gold); border-bottom-color: var(--gold); }

	/* SUMMARY TABLE */
	.summary-table { width: 100%; border-collapse: collapse; }
	.summary-table th, .summary-table td { padding: 8px 10px; text-align: right; font-size: 13px; }
	.summary-table th {
		text-align: left; font-size: 11px; text-transform: uppercase;
		letter-spacing: .04em; color: var(--muted); border-bottom: 2px solid var(--line);
	}
	.summary-table td { border-bottom: 1px solid var(--line-soft, #F2EDE2); }
	.row-label { text-align: left !important; font-weight: 500; }
	.bold { font-weight: 600; }
	.delta-ok { color: var(--green, #2d6a4f); }
	.delta-warn { color: #c4880d; }
	.delta-over { color: var(--red, #A13024); }

	/* REF TABLE */
	.ref-table { width: 100%; border-collapse: collapse; }
	.ref-table th {
		text-align: left; padding: 8px 10px; font-size: 11px;
		text-transform: uppercase; letter-spacing: .04em;
		color: var(--muted); border-bottom: 2px solid var(--line);
	}
	.ref-table td { padding: 7px 10px; border-bottom: 1px solid var(--line-soft, #F2EDE2); font-size: 13px; }
	.ref-table .num { text-align: right; font-variant-numeric: tabular-nums; }
	.ref-table tr:hover { background: var(--line-soft, #F2EDE2); }
	.note-red { color: var(--red, #A13024); }
	.note-warn { color: #c4880d; }
	.portions-note { font-size: 12px; color: var(--muted); margin-bottom: 14px; }
	.portions-footnote { font-size: 11px; color: var(--muted); margin-top: 10px; }

	/* WARNINGS */
	.warning { padding: 8px 12px; background: #fff3e0; border: 1px solid #ffe0b2; border-radius: 8px; font-size: 12px; color: #e65100; margin-top: 8px; }

	/* RESPONSIVE */
	@media (max-width: 600px) {
		.calc-app { padding: 12px; }
		.fg { grid-template-columns: 1fr 1fr; }
		.budget-row { flex-direction: column; }
		.topbar-left h1 { font-size: 17px; }
	}
</style>
