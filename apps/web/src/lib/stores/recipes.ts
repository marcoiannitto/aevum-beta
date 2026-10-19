/**
 * Recipe store — load and filter recipes from API.
 * Maps to RECIPES/loadRecipes/renderRecipeList from index.html.
 */
import { writable, get } from 'svelte/store';
import { api } from '$lib/api/client';

export interface Recipe {
	name: string;
	protein: string;
	cuisine: string;
	kcal: number;
	protein_g: number;
	fat_g: number;
	carbs_g: number;
	ingredients: string[];
	steps: string[];
	phases?: string;
	[key: string]: unknown;
}

export const recipes = writable<Recipe[]>([]);
export const recipesLoaded = writable(false);

const CACHE_KEY = 'aevum_recipes_cache';

export async function loadRecipes(): Promise<void> {
	if (get(recipesLoaded)) return;

	// Cache first
	try {
		const cached = localStorage.getItem(CACHE_KEY);
		if (cached) {
			recipes.set(JSON.parse(cached));
			recipesLoaded.set(true);
		}
	} catch { /* noop */ }

	try {
		const d = await api<{ recipes: Recipe[] }>('recipes', {}, { contentType: 'text/plain;charset=utf-8' });
		if (d?.recipes) {
			recipes.set(d.recipes);
			recipesLoaded.set(true);
			localStorage.setItem(CACHE_KEY, JSON.stringify(d.recipes));
		}
	} catch { /* noop */ }
}

/** Check if recipe matches a phase filter */
export function recipePhaseMatch(r: Recipe, phase: string): boolean {
	if (!phase || phase === 'all') return true;
	const rp = String(r.phases || '').toLowerCase();
	if (!rp || rp === 'all') return true;
	return rp.split(/[,/|]/).map(s => s.trim()).includes(phase.toLowerCase());
}

/** Get unique cuisines from recipe list */
export function getCuisines(): string[] {
	return [...new Set(get(recipes).map(r => r.cuisine).filter(Boolean))].sort();
}

/** Get favourites from localStorage */
export function getFavs(): string[] {
	try { return JSON.parse(localStorage.getItem('aevum_fav_recipes') || '[]'); } catch { return []; }
}

export function toggleFav(name: string): void {
	const f = getFavs();
	const idx = f.indexOf(name);
	if (idx >= 0) f.splice(idx, 1); else f.push(name);
	localStorage.setItem('aevum_fav_recipes', JSON.stringify(f));
}
