<!--
  Food Hub — bottom sheet with Guide / Check / Calc tabs.
  Guide: phase-specific allowed/limited/no food lists
  Check: AI foodcheck verdict
  Calc: AI macro estimation
-->
<script lang="ts">
	import { get } from 'svelte/store';
	import Sheet from '$lib/components/ui/Sheet.svelte';
	import { profile } from '$lib/stores/auth';
	import { phaseFor } from '$lib/stores/phases';
	import { currentDay } from '$lib/stores/day';
	import { aiPost } from '$lib/api/client';

	let {
		open = false,
		onClose
	}: {
		open: boolean;
		onClose: () => void;
	} = $props();

	type FhTab = 'guide' | 'check' | 'calc';
	let tab = $state<FhTab>('guide');

	// ── Guide data (phase-keyed) ──
	const FOOD_GUIDE: Record<string, { allowed: string[]; limited: string[]; no: string[] }> = {
		loading: {
			allowed: ['All foods', 'Eat freely — this is the loading phase'],
			limited: [],
			no: []
		},
		activation: {
			allowed: ['Lean protein (chicken breast, white fish, egg whites)', 'Non-starchy vegetables', 'Certain fruits (apple, grapefruit, strawberries)', 'Grissini or Melba toast (2/day)'],
			limited: ['Spices and herbs (in moderation)', 'Lemon juice', 'Apple cider vinegar'],
			no: ['Sugar & sweeteners', 'Oil, butter, fats', 'Dairy (except cottage cheese)', 'Starchy vegetables', 'Nuts & seeds', 'Alcohol']
		},
		transition: {
			allowed: ['Lean protein (chicken breast, white fish, egg whites)', 'Non-starchy vegetables', 'Certain fruits (apple, grapefruit, strawberries)', 'Grissini or Melba toast (2/day)'],
			limited: ['Spices and herbs (in moderation)', 'Lemon juice', 'Apple cider vinegar', 'Small amounts of healthy fats'],
			no: ['Sugar & sweeteners', 'Excessive oils/fats', 'Alcohol', 'Processed foods']
		},
		stabilization: {
			allowed: ['All proteins', 'All vegetables', 'All fruits', 'Whole grains', 'Healthy fats (olive oil, avocado, nuts)', 'Dairy in moderation'],
			limited: ['Sugar (minimal)', 'Alcohol (occasional)', 'Refined carbs'],
			no: ['Excessive sugar', 'Deep-fried foods', 'Excessive alcohol']
		},
		maintenance: {
			allowed: ['All whole foods', 'Balanced meals', 'Varied diet'],
			limited: ['Processed foods', 'Refined sugar', 'Alcohol'],
			no: ['Nothing strictly forbidden — focus on balance']
		}
	};

	function currentPhaseKey(): string {
		return phaseFor(get(currentDay)).key;
	}

	function guideFor(): { allowed: string[]; limited: string[]; no: string[] } {
		const pk = currentPhaseKey();
		return FOOD_GUIDE[pk] ?? FOOD_GUIDE['maintenance']!;
	}

	// ── Check ──
	let checkInput = $state('');
	let checkResult = $state<{ verdict: string; reason: string } | null>(null);
	let checkLoading = $state(false);
	const checkCache: Record<string, { verdict: string; reason: string }> = {};

	async function doCheck() {
		const food = checkInput.trim();
		if (!food) return;
		const pk = currentPhaseKey();
		const cacheKey = `${pk}:${food.toLowerCase()}`;
		if (checkCache[cacheKey]) {
			checkResult = checkCache[cacheKey];
			return;
		}
		checkLoading = true;
		checkResult = null;
		try {
			const d = await aiPost<{ verdict: string; reason: string }>({ action: 'foodcheck', food, phase: pk });
			checkResult = d;
			checkCache[cacheKey] = d;
		} catch {
			checkResult = { verdict: 'error', reason: 'Could not check. Try again.' };
		}
		checkLoading = false;
	}

	function checkKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') doCheck();
	}

	function verdictIcon(v: string): string {
		if (v === 'yes') return '✅';
		if (v === 'limited') return '⚠️';
		if (v === 'no') return '🚫';
		return '❓';
	}

	function verdictClass(v: string): string {
		if (v === 'yes') return 'vok';
		if (v === 'limited') return 'vwarn';
		if (v === 'no') return 'vno';
		return '';
	}

	// ── Calc ──
	let calcInput = $state('');
	let calcResult = $state<{ kcal: number; protein: number; fat: number; carbs: number } | null>(null);
	let calcLoading = $state(false);

	async function doCalc() {
		const desc = calcInput.trim();
		if (!desc) return;
		calcLoading = true;
		calcResult = null;
		try {
			const d = await aiPost<{ kcal: number; protein: number; fat: number; carbs: number }>({
				action: 'estimate',
				description: desc,
				phase: currentPhaseKey()
			});
			calcResult = d;
		} catch {
			calcResult = null;
		}
		calcLoading = false;
	}
</script>

<Sheet {open} {onClose} title="Food Hub">
	<!-- Tab bar -->
	<div class="tab-bar">
		<button class:active={tab === 'guide'} onclick={() => { tab = 'guide'; }}>Guide</button>
		<button class:active={tab === 'check'} onclick={() => { tab = 'check'; }}>Check</button>
		<button class:active={tab === 'calc'} onclick={() => { tab = 'calc'; }}>Macros</button>
	</div>

	{#if tab === 'guide'}
		{@const guide = guideFor()}
		<div class="guide">
			{#if guide.allowed.length}
				<div class="guide-section">
					<h4 class="gs-head allowed">✅ Allowed</h4>
					{#each guide.allowed as item}
						<p class="gs-item">{item}</p>
					{/each}
				</div>
			{/if}
			{#if guide.limited.length}
				<div class="guide-section">
					<h4 class="gs-head limited">⚠️ Limited</h4>
					{#each guide.limited as item}
						<p class="gs-item">{item}</p>
					{/each}
				</div>
			{/if}
			{#if guide.no.length}
				<div class="guide-section">
					<h4 class="gs-head no">🚫 Avoid</h4>
					{#each guide.no as item}
						<p class="gs-item">{item}</p>
					{/each}
				</div>
			{/if}
			<p class="phase-note">Showing rules for <strong>{phaseFor(get(currentDay)).name}</strong> phase</p>
		</div>

	{:else if tab === 'check'}
		<div class="check">
			<div class="check-input-row">
				<input
					type="text"
					bind:value={checkInput}
					placeholder="e.g. Greek yoghurt"
					onkeydown={checkKeydown}
				/>
				<button class="btn-check" onclick={doCheck} disabled={checkLoading}>
					{checkLoading ? '…' : 'Check'}
				</button>
			</div>

			{#if checkResult}
				<div class="check-result {verdictClass(checkResult.verdict)}">
					<span class="cr-icon">{verdictIcon(checkResult.verdict)}</span>
					<div>
						<strong class="cr-verdict">{checkResult.verdict}</strong>
						<p class="cr-reason">{checkResult.reason}</p>
					</div>
				</div>
			{/if}
		</div>

	{:else if tab === 'calc'}
		<div class="calc">
			<textarea
				bind:value={calcInput}
				placeholder="Describe your meal, e.g.&#10;150g chicken breast&#10;1 cup rice&#10;salad with olive oil"
				rows="4"
			></textarea>
			<button class="btn-calc" onclick={doCalc} disabled={calcLoading}>
				{calcLoading ? 'Estimating…' : 'Calculate macros'}
			</button>

			{#if calcResult}
				<div class="calc-result">
					<div class="cr-cell"><span class="cr-v">{Math.round(calcResult.kcal)}</span><span class="cr-k">kcal</span></div>
					<div class="cr-cell"><span class="cr-v">{Math.round(calcResult.protein)}</span><span class="cr-k">protein</span></div>
					<div class="cr-cell"><span class="cr-v">{Math.round(calcResult.fat)}</span><span class="cr-k">fat</span></div>
					<div class="cr-cell"><span class="cr-v">{Math.round(calcResult.carbs)}</span><span class="cr-k">carbs</span></div>
				</div>
			{/if}
			<p class="disclaimer">AI estimates — may not be exact.</p>
		</div>
	{/if}
</Sheet>

<style>
	.tab-bar {
		display: flex;
		gap: 0;
		border-bottom: 1px solid var(--line);
		margin-bottom: 16px;
	}
	.tab-bar button {
		flex: 1;
		padding: 10px 0;
		font-size: 0.88rem;
		font-weight: 500;
		color: var(--muted);
		border-bottom: 2px solid transparent;
		transition: color 0.15s, border-color 0.15s;
	}
	.tab-bar button.active {
		color: var(--gold);
		border-bottom-color: var(--gold);
	}

	/* Guide */
	.guide-section {
		margin-bottom: 16px;
	}
	.gs-head {
		font-size: 0.82rem;
		font-weight: 600;
		margin-bottom: 6px;
	}
	.gs-head.allowed { color: #3E7A6A; }
	.gs-head.limited { color: var(--warn); }
	.gs-head.no { color: var(--over); }
	.gs-item {
		font-size: 0.88rem;
		color: var(--ink);
		padding: 3px 0;
		padding-left: 12px;
	}
	.phase-note {
		font-size: 0.78rem;
		color: var(--muted);
		margin-top: 12px;
		text-align: center;
	}

	/* Check */
	.check-input-row {
		display: flex;
		gap: 8px;
		margin-bottom: 16px;
	}
	.check-input-row input {
		flex: 1;
		padding: 10px 12px;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: 0.92rem;
		background: #fff;
	}
	.check-input-row input:focus {
		outline: none;
		border-color: var(--gold);
	}
	.btn-check {
		padding: 10px 16px;
		background: var(--gold);
		color: #fff;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.88rem;
		white-space: nowrap;
	}
	.btn-check:disabled { opacity: 0.5; }
	.check-result {
		display: flex;
		gap: 12px;
		padding: 14px;
		border-radius: 10px;
		background: var(--card);
		border: 1px solid var(--line);
	}
	.check-result.vok { border-color: #3E7A6A; background: #f0f8f5; }
	.check-result.vwarn { border-color: var(--warn); background: var(--warn-bg); }
	.check-result.vno { border-color: var(--over); background: var(--over-bg); }
	.cr-icon { font-size: 1.4rem; }
	.cr-verdict {
		text-transform: capitalize;
		font-size: 0.92rem;
	}
	.cr-reason {
		font-size: 0.85rem;
		color: var(--ink-soft);
		margin-top: 2px;
	}

	/* Calc */
	.calc textarea {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: 0.92rem;
		background: #fff;
		resize: vertical;
		font-family: inherit;
	}
	.calc textarea:focus {
		outline: none;
		border-color: var(--gold);
	}
	.btn-calc {
		width: 100%;
		padding: 12px;
		background: var(--gold);
		color: #fff;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.92rem;
		margin-top: 10px;
	}
	.btn-calc:disabled { opacity: 0.5; }
	.calc-result {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
		margin-top: 16px;
		text-align: center;
	}
	.cr-cell {
		background: var(--paper);
		border-radius: 8px;
		padding: 10px 4px;
	}
	.cr-v {
		display: block;
		font-family: var(--serif);
		font-size: 1.15rem;
		font-weight: 600;
	}
	.cr-k {
		font-size: 0.72rem;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.disclaimer {
		font-size: 0.75rem;
		color: var(--muted);
		text-align: center;
		margin-top: 10px;
	}
</style>
