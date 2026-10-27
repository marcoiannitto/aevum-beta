<!--
  RecipesPanel — search/filter/favourite recipes.
  Maps to renderRecipeList() from index.html.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { recipes, recipesLoaded, loadRecipes, recipePhaseMatch, getCuisines, getFavs, toggleFav, type Recipe } from '$lib/stores/recipes';
	import { phaseFor } from '$lib/stores/phases';
	import { currentDay } from '$lib/stores/day';

	let search = $state('');
	let phaseFilter = $state('all');
	let cuisineFilter = $state('all');
	let favOnly = $state(false);
	let selected = $state<Recipe | null>(null);
	let favSet = $state<Set<string>>(new Set());

	const currentPhase = $derived(phaseFor(get(currentDay)));
	const cuisines = $derived(getCuisines());

	const filtered = $derived.by(() => {
		const q = search.toLowerCase().trim();
		return get(recipes).filter(r => {
			if (phaseFilter !== 'all' && !recipePhaseMatch(r, phaseFilter)) return false;
			if (cuisineFilter !== 'all' && r.cuisine !== cuisineFilter) return false;
			if (favOnly && !favSet.has(r.name)) return false;
			if (q && !r.name.toLowerCase().includes(q) && !r.protein.toLowerCase().includes(q)) return false;
			return true;
		});
	});

	function refreshFavs() { favSet = new Set(getFavs()); }

	function toggleFavourite(name: string) {
		toggleFav(name);
		refreshFavs();
	}

	function selectRecipe(r: Recipe) { selected = r; }
	function closeSheet() { selected = null; }

	onMount(() => {
		loadRecipes();
		refreshFavs();
	});
</script>

<!-- Filters -->
<div class="rp-filters">
	<input class="rp-search" type="search" placeholder="Search recipes…" bind:value={search} />

	<div class="rp-chips">
		<button class="chip" class:on={phaseFilter === 'all'} onclick={() => phaseFilter = 'all'}>All phases</button>
		<button class="chip" class:on={phaseFilter === currentPhase.key} onclick={() => phaseFilter = currentPhase.key}>
			{currentPhase.name}
		</button>
	</div>

	<div class="rp-chips">
		<button class="chip" class:on={cuisineFilter === 'all'} onclick={() => cuisineFilter = 'all'}>All cuisines</button>
		{#each cuisines as c}
			<button class="chip" class:on={cuisineFilter === c} onclick={() => cuisineFilter = c}>{c}</button>
		{/each}
	</div>

	<label class="rp-fav-toggle">
		<input type="checkbox" bind:checked={favOnly} /> Favourites only
	</label>
</div>

<!-- Recipe cards -->
{#if !get(recipesLoaded)}
	<div class="rp-empty">Loading recipes…</div>
{:else if !filtered.length}
	<div class="rp-empty">No recipes match your filters.</div>
{:else}
	<div class="rp-list">
		{#each filtered as r}
			<div class="rp-card" onclick={() => selectRecipe(r)} role="button" tabindex="0">
				<div class="rp-top">
					<span class="rp-name">{r.name}</span>
					<button class="rp-star" onclick={(e) => { e.stopPropagation(); toggleFavourite(r.name); }}>
						{favSet.has(r.name) ? '★' : '☆'}
					</button>
				</div>
				<div class="rp-meta">
					<span>{r.protein}</span>
					{#if r.cuisine}<span>· {r.cuisine}</span>{/if}
				</div>
				<div class="rp-macros">
					<b>{Math.round(r.kcal)}</b> kcal · {Math.round(r.protein_g)}P · {Math.round(r.fat_g)}F · {Math.round(r.carbs_g)}C
				</div>
			</div>
		{/each}
	</div>
{/if}

<!-- Recipe detail sheet -->
{#if selected}
	<div class="sheet-bg" onclick={closeSheet} role="presentation"></div>
	<div class="sheet">
		<div class="sheet-handle"></div>
		<h3 class="sheet-title">{selected.name}</h3>
		<div class="rp-macros" style="margin-bottom:12px">
			<b>{Math.round(selected.kcal)}</b> kcal · {Math.round(selected.protein_g)}P · {Math.round(selected.fat_g)}F · {Math.round(selected.carbs_g)}C
		</div>

		{#if selected.ingredients?.length}
			<h4 class="sheet-sub">Ingredients</h4>
			<ul class="sheet-list">
				{#each selected.ingredients as ing}
					<li>{ing}</li>
				{/each}
			</ul>
		{/if}

		{#if selected.steps?.length}
			<h4 class="sheet-sub">Method</h4>
			<ol class="sheet-list">
				{#each selected.steps as step}
					<li>{step}</li>
				{/each}
			</ol>
		{/if}

		<button class="sheet-close" onclick={closeSheet}>Close</button>
	</div>
{/if}

<style>
	.rp-filters { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
	.rp-search {
		width: 100%; padding: 10px 14px;
		border: 1px solid var(--line); border-radius: 10px;
		font-size: 14px; font-family: inherit;
		background: var(--card, #fff);
	}
	.rp-chips { display: flex; gap: 6px; flex-wrap: wrap; }
	.chip {
		padding: 6px 12px; border-radius: 20px;
		font-size: 12px; border: 1px solid var(--line);
		background: var(--card, #fff); cursor: pointer;
		font-family: inherit; white-space: nowrap;
	}
	.chip.on { background: var(--gold); color: #fff; border-color: var(--gold); }
	.rp-fav-toggle {
		font-size: 13px; color: var(--muted);
		display: flex; align-items: center; gap: 6px;
	}

	.rp-list { display: flex; flex-direction: column; gap: 8px; }
	.rp-card {
		text-align: left; width: 100%;
		padding: 14px; background: var(--card, #fff);
		border: 1px solid var(--line); border-radius: 12px;
		cursor: pointer; font-family: inherit;
	}
	.rp-top { display: flex; justify-content: space-between; align-items: flex-start; }
	.rp-name { font-size: 15px; font-weight: 500; }
	.rp-star { font-size: 18px; background: none; border: none; cursor: pointer; color: var(--gold); }
	.rp-meta { font-size: 12px; color: var(--muted); margin: 2px 0 4px; }
	.rp-macros { font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }

	.rp-empty { text-align: center; color: var(--muted); font-size: 13px; padding: 30px; }

	/* Sheet */
	.sheet-bg {
		position: fixed; inset: 0; background: rgba(0,0,0,.4);
		z-index: 90;
	}
	.sheet {
		position: fixed; bottom: 0; left: 0; right: 0;
		background: var(--paper, #fff);
		border-radius: 20px 20px 0 0;
		padding: 20px 20px 32px;
		max-height: 80dvh; overflow-y: auto;
		z-index: 91;
	}
	.sheet-handle {
		width: 36px; height: 4px; border-radius: 2px;
		background: var(--line); margin: 0 auto 14px;
	}
	.sheet-title { font-size: 18px; font-weight: 600; margin: 0 0 6px; }
	.sheet-sub { font-size: 13px; font-weight: 600; margin: 12px 0 6px; text-transform: uppercase; letter-spacing: 0.04em; }
	.sheet-list { font-size: 14px; padding-left: 20px; margin: 0; line-height: 1.6; }
	.sheet-close {
		width: 100%; margin-top: 16px; padding: 12px;
		border: 1px solid var(--line); border-radius: 12px;
		background: var(--card, #fff); font-size: 14px;
		cursor: pointer; font-family: inherit;
	}
</style>
