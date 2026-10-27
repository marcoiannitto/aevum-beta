<!--
  Meal Log Sheet — 3-tab entry (Describe / Ingredients / Photo),
  always-visible macro grid with phase-aware limits,
  traffic light food flags for bucket phases, AI disclaimer.
  Matches V2 structure with modern V3 styling.
-->
<script lang="ts">
	import { get } from 'svelte/store';
	import Sheet from '$lib/components/ui/Sheet.svelte';
	import { dayData, saveDay, currentDay } from '$lib/stores/day';
	import { phaseFor, phReg } from '$lib/stores/phases';
	import { ruleFor, bandClass } from '$lib/stores/rules';
	import { profile } from '$lib/stores/auth';
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

	// --- Per-meal macro caps (bucket phases) ---
	const MEAL_KCAL = 250;
	const MEAL_FAT = 10;
	const MEAL_CARB = 15;

	type TabMode = 'describe' | 'ingredients' | 'photo';
	let tab = $state<TabMode>('describe');
	let mealName = $state('');
	let description = $state('');
	let imageBase64 = $state('');
	let imagePreview = $state('');
	let kcal = $state('');
	let protein = $state('');
	let fat = $state('');
	let carbs = $state('');
	let mealTime = $state('');
	let loading = $state(false);
	let error = $state('');
	let hint = $state('');
	let estimatedItems = $state<any[]>([]);
	let ingredients = $state<{ food: string; qty: string }[]>([{ food: '', qty: '' }]);
	let cameraInput: HTMLInputElement;
	let galleryInput: HTMLInputElement;
	let showPhotoChoice = $state(false);

	// Derived phase info
	let phaseKey = $derived(phaseFor(get(currentDay), get(profile)).key);
	let phaseReg = $derived(phReg(phaseKey));
	let isBucket = $derived(phaseReg ? !!phaseReg.use_buckets : (phaseKey === 'activation' || phaseKey === 'transition'));

	// Over-limit checks
	let kcalOver = $derived(isBucket && (+kcal || 0) > MEAL_KCAL);
	let fatOver = $derived(isBucket && (+fat || 0) > MEAL_FAT);
	let carbsOver = $derived(isBucket && (+carbs || 0) > MEAL_CARB);

	// Max labels for macro grid
	let maxKcal = $derived(isBucket ? MEAL_KCAL : (ruleFor(phaseKey, 'kcal')?.green_hi ?? ''));
	let maxFat = $derived(isBucket ? MEAL_FAT : (ruleFor(phaseKey, 'fat')?.green_hi ?? ''));
	let maxCarbs = $derived(isBucket ? MEAL_CARB : (ruleFor(phaseKey, 'carbs')?.green_hi ?? ''));

	function onImagePick(e: Event) {
		const file = (e.target as HTMLInputElement)?.files?.[0];
		if (!file) return;
		if (file.size > 4 * 1024 * 1024) { error = 'Image too large (max 4 MB).'; return; }
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			imagePreview = result;
			imageBase64 = result.replace(/^data:image\/\w+;base64,/, '');
			showPhotoChoice = false;
		};
		reader.readAsDataURL(file);
	}

	function clearImage() {
		imageBase64 = '';
		imagePreview = '';
		if (cameraInput) cameraInput.value = '';
		if (galleryInput) galleryInput.value = '';
	}

	// Pre-fill on edit, reset on new
	$effect(() => {
		if (open && editIndex >= 0) {
			const day = get(dayData);
			const meal = day?.meals?.[editIndex];
			if (meal) {
				tab = 'describe';
				mealName = meal.name || '';
				kcal = String(meal.kcal || '');
				protein = String(meal.protein || '');
				fat = String(meal.fat || '');
				carbs = String(meal.carbs || '');
				mealTime = meal.time || new Date().toTimeString().slice(0, 5);
				estimatedItems = (meal as any).items || [];
			}
		} else if (open) {
			tab = 'describe';
			description = '';
			imageBase64 = '';
			imagePreview = '';
			mealName = '';
			kcal = '';
			protein = '';
			fat = '';
			carbs = '';
			mealTime = new Date().toTimeString().slice(0, 5);
			error = '';
			hint = '';
			estimatedItems = [];
			ingredients = [{ food: '', qty: '' }];
			showPhotoChoice = false;
		}
	});

	function itemFlag(it: any): { cls: string; label: string } {
		const grams = +it.grams || 0;
		const v = it.verdict || 'limited';
		if (v === 'no') return { cls: 'bad', label: 'Not allowed' };
		if (v === 'limited') return { cls: 'warn', label: it.note || 'Limited' };
		if (/egg\s*white/i.test(it.name || '')) {
			if (grams > 250) return { cls: 'bad', label: 'Over 6' };
			if (grams > 200) return { cls: 'warn', label: 'Near 6' };
			return { cls: 'ok', label: 'Allowed' };
		}
		const t = it.type || 'other';
		const cap = (t === 'protein' || t === 'veg') ? { amber: 111, red: 131 } : { amber: 111, red: Infinity };
		if (grams > cap.red) return { cls: 'bad', label: 'Too much' };
		if (grams > cap.amber) return { cls: 'warn', label: `Over ${cap.amber}g` };
		return { cls: 'ok', label: 'Allowed' };
	}

	function fillMacros(d: any) {
		if (d.name && !mealName.trim()) mealName = d.name;
		kcal = String(Math.round(d.kcal ?? 0));
		protein = String(Math.round(d.protein ?? 0));
		fat = String(Math.round(d.fat ?? 0));
		carbs = String(Math.round(d.carbs ?? 0));
		estimatedItems = Array.isArray(d.items) ? d.items : [];
		hint = 'AI estimate. Tap any number to adjust.';
	}

	async function calculate() {
		error = '';
		hint = '';
		let payload: Record<string, unknown> | null = null;

		if (tab === 'describe') {
			const desc = description.trim();
			if (!desc) return;
			payload = { action: 'estimate', description: desc, phase: phaseKey };
		} else if (tab === 'ingredients') {
			const list = ingredients.filter((i) => i.food.trim());
			if (!list.length) { hint = 'Add at least one ingredient.'; return; }
			const desc = list.map((i) => `${i.qty || ''} ${i.food}`.trim()).join(', ');
			payload = { action: 'estimate', description: desc, phase: phaseKey };
		} else if (tab === 'photo') {
			if (!imageBase64) { hint = 'Add a photo first.'; return; }
			payload = { action: 'estimate', description: description.trim() || '(see photo)', image: imageBase64, phase: phaseKey };
		}

		if (!payload) return;
		loading = true;
		try {
			let d: any;
			try { d = await aiPost(payload); } catch { d = await aiPost(payload); } // retry cold start
			fillMacros(d);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			error = msg && msg !== 'undefined' ? msg : (isBucket ? 'Could not check it. Try again.' : 'Could not calculate. Enter the macros yourself.');
		}
		loading = false;
	}

	function addIngredient() {
		ingredients = [...ingredients, { food: '', qty: '' }];
	}

	function removeIngredient(i: number) {
		ingredients = ingredients.filter((_, idx) => idx !== i);
		if (!ingredients.length) ingredients = [{ food: '', qty: '' }];
	}

	function logMeal() {
		const day = get(dayData);
		if (!day) return;
		if (!day.meals) day.meals = [];

		const entry: Record<string, unknown> = {
			name: mealName || description || 'Meal',
			kcal: +(kcal || 0),
			protein: +(protein || 0),
			fat: +(fat || 0),
			carbs: +(carbs || 0),
			time: mealTime || new Date().toTimeString().slice(0, 5),
			ts: Date.now()
		};
		if (estimatedItems.length > 0) entry.items = estimatedItems;

		if (editIndex >= 0 && day.meals[editIndex]) {
			day.meals[editIndex] = entry;
		} else {
			day.meals.push(entry);
		}

		dayData.set({ ...day });
		saveDay(true);
		onClose();
	}

	function removeMeal() {
		if (editIndex < 0) return;
		const day = get(dayData);
		if (!day?.meals?.[editIndex]) return;
		day.meals.splice(editIndex, 1);
		dayData.set({ ...day });
		saveDay(true);
		onClose();
	}

	let canSubmit = $derived(!!kcal);
</script>

<Sheet {open} {onClose} title={editIndex >= 0 ? 'Edit meal' : 'Log a meal'}>
	<!-- Meal name -->
	<input
		class="me-name"
		type="text"
		bind:value={mealName}
		placeholder="Meal name (optional)"
	/>

	<!-- Tab bar (Describe / Ingredients / Photo) -->
	{#if editIndex < 0}
		<div class="mode-tabs">
			<button class="mode-tab" class:on={tab === 'describe'} onclick={() => (tab = 'describe')}>Describe</button>
			<button class="mode-tab" class:on={tab === 'ingredients'} onclick={() => (tab = 'ingredients')}>Ingredients</button>
			<button class="mode-tab" class:on={tab === 'photo'} onclick={() => (tab = 'photo')}>Photo</button>
		</div>
	{/if}

	<!-- DESCRIBE panel -->
	{#if tab === 'describe' && editIndex < 0}
		<div class="panel">
			<textarea
				bind:value={description}
				placeholder="e.g. chicken salad with lettuce and mushroom, 300g"
				rows="3"
			></textarea>
			<button class="calc-btn" onclick={calculate} disabled={loading || !description.trim()}>
				{#if loading}<span class="spinner"></span> Calculating...{:else}<span class="ai-star">&#10022;</span> Calculate with AI{/if}
			</button>
		</div>
	{/if}

	<!-- INGREDIENTS panel -->
	{#if tab === 'ingredients' && editIndex < 0}
		<div class="panel">
			{#each ingredients as ing, i}
				<div class="ing-row">
					<input
						class="ing-food"
						placeholder="e.g. eggs"
						bind:value={ing.food}
					/>
					<input
						class="ing-qty"
						placeholder="100g / 3"
						bind:value={ing.qty}
					/>
					<button class="ing-x" onclick={() => removeIngredient(i)}>&times;</button>
				</div>
			{/each}
			<button class="add-ing" onclick={addIngredient}>+ Add ingredient</button>
			<button class="calc-btn" onclick={calculate} disabled={loading}>
				{#if loading}<span class="spinner"></span> Calculating...{:else}<span class="ai-star">&#10022;</span> Calculate with AI{/if}
			</button>
		</div>
	{/if}

	<!-- PHOTO panel -->
	{#if tab === 'photo' && editIndex < 0}
		<div class="panel">
			{#if imagePreview}
				<div class="photo-preview">
					<img src={imagePreview} alt="Meal photo" />
					<button class="photo-clear" onclick={clearImage} aria-label="Remove photo">&times;</button>
				</div>
			{:else}
				<button class="photo-drop" onclick={() => (showPhotoChoice = true)}>
					<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
					<span>Take or choose a photo</span>
				</button>
			{/if}

			{#if showPhotoChoice}
				<div class="photo-choice">
					<button onclick={() => cameraInput.click()}>Take Photo</button>
					<button onclick={() => galleryInput.click()}>Choose from Gallery</button>
					<button class="pc-cancel" onclick={() => (showPhotoChoice = false)}>Cancel</button>
				</div>
			{/if}

			<input bind:this={cameraInput} type="file" accept="image/*" capture="environment" onchange={onImagePick} hidden />
			<input bind:this={galleryInput} type="file" accept="image/*" onchange={onImagePick} hidden />

			<button class="calc-btn" onclick={calculate} disabled={loading || !imageBase64}>
				{#if loading}<span class="spinner"></span> Calculating...{:else}<span class="ai-star">&#10022;</span> Calculate with AI{/if}
			</button>
		</div>
	{/if}

	<!-- MACRO GRID — always visible -->
	<div class="macro-section">
		<div class="macro-label">Macros</div>
		<div class="me-grid">
			<div class="me-cell" class:over={kcalOver}>
				<label>kcal{#if maxKcal}<span class="me-max">{maxKcal}</span>{/if}</label>
				<input type="number" inputmode="numeric" placeholder="0" bind:value={kcal} />
			</div>
			<div class="me-cell">
				<label>protein</label>
				<input type="number" inputmode="numeric" placeholder="0" bind:value={protein} />
			</div>
			<div class="me-cell" class:over={fatOver}>
				<label>fat{#if maxFat}<span class="me-max">{maxFat}</span>{/if}</label>
				<input type="number" inputmode="numeric" placeholder="0" bind:value={fat} />
			</div>
			<div class="me-cell" class:over={carbsOver}>
				<label>carbs{#if maxCarbs}<span class="me-max">{maxCarbs}</span>{/if}</label>
				<input type="number" inputmode="numeric" placeholder="0" bind:value={carbs} />
			</div>
		</div>
	</div>

	<!-- TRAFFIC LIGHT FLAGS (bucket phases only) -->
	{#if isBucket && estimatedItems.length > 0}
		<div class="me-flags">
			{#each estimatedItems as it}
				{@const flag = itemFlag(it)}
				<div class="mi">
					<span class="mi-dot {flag.cls}"></span>
					<span class="mi-name">{it.name} {it.grams || 0}g</span>
					<span class="mi-flag {flag.cls}">{flag.label}</span>
				</div>
			{/each}
		</div>
	{:else if isBucket && editIndex < 0}
		<div class="me-flags">
			<div class="mf-empty">Describe your meal and tap Calculate to check it.</div>
		</div>
	{/if}

	<!-- Time -->
	<label class="field time-field">
		<span>Time</span>
		<input type="time" bind:value={mealTime} />
	</label>

	<!-- Hint / error -->
	{#if error}<p class="err">{error}</p>{/if}
	{#if hint}<p class="hint">{hint}</p>{/if}

	<!-- Disclaimer -->
	<p class="disclaimer">AI estimates can vary. In the description, say how it's cooked (grilled, boiled, with or without oil) for better accuracy.</p>

	<!-- Submit -->
	<button class="btn-primary" onclick={logMeal} disabled={!canSubmit}>
		{editIndex >= 0 ? 'Save changes' : 'Add to day'}
	</button>

	{#if editIndex >= 0}
		<button class="btn-danger" onclick={removeMeal}>Remove meal</button>
	{/if}
</Sheet>

<style>
	/* ── Meal name ── */
	.me-name {
		width: 100%;
		padding: 13px 14px;
		border: 1px solid var(--line);
		border-radius: 13px;
		background: var(--card);
		margin-bottom: 12px;
		font-weight: 500;
		font-size: 0.95rem;
		font-family: inherit;
		color: var(--ink);
	}
	.me-name::placeholder { color: var(--muted); font-weight: 400; }
	.me-name:focus { outline: none; border-color: var(--gold); }

	/* ── Tab bar ── */
	.mode-tabs {
		display: flex;
		gap: 6px;
		background: var(--line-soft, rgba(0,0,0,.04));
		border-radius: 12px;
		padding: 4px;
		margin-bottom: 14px;
	}
	.mode-tab {
		flex: 1;
		padding: 10px;
		border-radius: 9px;
		font-size: 14px;
		font-weight: 600;
		color: var(--muted);
		background: transparent;
		border: none;
		cursor: pointer;
		font-family: inherit;
		transition: background 0.15s, color 0.15s;
	}
	.mode-tab.on {
		background: var(--card);
		color: var(--ink);
		box-shadow: 0 1px 3px rgba(0,0,0,.06);
	}

	/* ── Panels ── */
	.panel {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 4px;
	}
	.panel textarea {
		width: 100%;
		padding: 12px 14px;
		border: 1px solid var(--line);
		border-radius: 12px;
		font-size: 0.92rem;
		background: var(--card);
		resize: vertical;
		font-family: inherit;
		color: var(--ink);
		min-height: 80px;
	}
	.panel textarea:focus { outline: none; border-color: var(--gold); }

	/* ── Ingredients ── */
	.ing-row {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.ing-food {
		flex: 2;
		padding: 10px 12px;
		border: 1px solid var(--line);
		border-radius: 10px;
		font-size: 0.9rem;
		background: var(--card);
		color: var(--ink);
		font-family: inherit;
	}
	.ing-qty {
		flex: 1;
		padding: 10px 12px;
		border: 1px solid var(--line);
		border-radius: 10px;
		font-size: 0.9rem;
		background: var(--card);
		color: var(--ink);
		font-family: inherit;
	}
	.ing-food:focus, .ing-qty:focus { outline: none; border-color: var(--gold); }
	.ing-x {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: none;
		background: none;
		color: var(--muted);
		font-size: 1.2rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.add-ing {
		border: none;
		background: none;
		color: var(--gold);
		font-size: 0.88rem;
		font-weight: 600;
		cursor: pointer;
		padding: 6px 0;
		text-align: left;
		font-family: inherit;
	}

	/* ── Calculate button ── */
	.calc-btn {
		width: 100%;
		padding: 12px;
		background: linear-gradient(135deg, var(--gold), var(--gold-deep, #9a7b2d));
		color: #fff;
		border: none;
		border-radius: 12px;
		font-weight: 600;
		font-size: 0.92rem;
		cursor: pointer;
		font-family: inherit;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}
	.calc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
	.ai-star { font-size: 1.1rem; }
	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255,255,255,.3);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
		display: inline-block;
	}
	@keyframes spin { to { transform: rotate(360deg); } }

	/* ── Photo ── */
	.photo-drop {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 28px 16px;
		border: 2px dashed var(--line);
		border-radius: 14px;
		color: var(--muted);
		background: none;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.88rem;
		width: 100%;
	}
	.photo-preview {
		position: relative;
		display: flex;
		justify-content: center;
	}
	.photo-preview img {
		width: 100%;
		max-height: 200px;
		object-fit: cover;
		border-radius: 12px;
		border: 1px solid var(--line);
	}
	.photo-clear {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: rgba(0,0,0,.6);
		color: #fff;
		font-size: 0.85rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		cursor: pointer;
	}
	.photo-choice {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 4px;
	}
	.photo-choice button {
		padding: 10px;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--card);
		color: var(--ink);
		font-size: 0.9rem;
		cursor: pointer;
		font-family: inherit;
	}
	.photo-choice .pc-cancel {
		color: var(--muted);
		border-color: transparent;
	}

	/* ── Macro grid ── */
	.macro-section {
		margin-top: 16px;
	}
	.macro-label {
		font-size: 12px;
		color: var(--muted);
		margin-bottom: 8px;
		font-weight: 500;
	}
	.me-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
	}
	.me-cell label {
		display: block;
		font-size: 11px;
		color: var(--muted);
		text-align: center;
		margin-bottom: 4px;
		line-height: 1.3;
	}
	.me-max {
		color: var(--muted);
		opacity: 0.85;
	}
	.me-max::before { content: ' \00b7  max '; }
	.me-cell input {
		width: 100%;
		padding: 12px 4px;
		border: 1px solid var(--line);
		border-radius: 11px;
		text-align: center;
		font-family: var(--serif);
		font-size: 18px;
		font-weight: 500;
		background: var(--card);
		color: var(--ink);
	}
	.me-cell input::placeholder { color: var(--line); }
	.me-cell input:focus { outline: none; border-color: var(--gold); }
	.me-cell.over input {
		border-color: var(--over);
		color: var(--over);
		background: var(--over-bg, #fef2f2);
	}
	.me-cell.over label { color: var(--over); }

	/* ── Traffic light flags ── */
	.me-flags {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin: 12px 0 4px;
	}
	.mf-empty {
		font-size: 12px;
		color: var(--muted);
		text-align: center;
		padding: 4px 0;
	}
	.mi {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 2px 0;
		font-size: 0.88rem;
	}
	.mi-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.mi-dot.ok { background: #22c55e; }
	.mi-dot.warn { background: #f59e0b; }
	.mi-dot.bad { background: #ef4444; }
	.mi-name {
		flex: 1;
		color: var(--ink);
	}
	.mi-flag {
		font-size: 0.8rem;
		font-weight: 600;
	}
	.mi-flag.ok { color: #22c55e; }
	.mi-flag.warn { color: #f59e0b; }
	.mi-flag.bad { color: #ef4444; }

	/* ── Time ── */
	.time-field {
		display: flex;
		flex-direction: column;
		gap: 3px;
		font-size: 0.82rem;
		color: var(--muted);
		margin-top: 14px;
	}
	.time-field input {
		padding: 10px 12px;
		border: 1px solid var(--line);
		border-radius: 10px;
		font-size: 0.92rem;
		background: var(--card);
		color: var(--ink);
		font-family: inherit;
	}
	.time-field input:focus { outline: none; border-color: var(--gold); }

	/* ── Hint / error / disclaimer ── */
	.err {
		font-size: 0.82rem;
		color: var(--over);
		margin: 4px 0;
	}
	.hint {
		font-size: 12px;
		color: var(--muted);
		text-align: center;
		margin: 4px 0;
	}
	.disclaimer {
		font-size: 11px;
		color: var(--muted);
		font-style: italic;
		text-align: center;
		line-height: 1.4;
		margin: 6px 4px 0;
	}

	/* ── Buttons ── */
	.btn-primary {
		width: 100%;
		padding: 14px;
		background: var(--gold);
		color: #fff;
		border: none;
		border-radius: 12px;
		font-weight: 600;
		font-size: 0.95rem;
		margin-top: 14px;
		cursor: pointer;
		font-family: inherit;
	}
	.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
	.btn-danger {
		width: 100%;
		padding: 10px;
		color: var(--over);
		font-size: 0.88rem;
		margin-top: 8px;
		background: none;
		border: none;
		cursor: pointer;
		font-family: inherit;
	}
</style>
