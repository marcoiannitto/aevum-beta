/**
 * Central store reset — clears all writable stores and localStorage caches.
 * Called on logout to prevent stale data leaking between users.
 */
import { get } from 'svelte/store';
import { profile, isProgram, pid, logout } from './auth';
import { dayData, currentDay, currentDate, dayPhases } from './day';
import { rules } from './rules';
import { phases, phasesList, phaseTransitions } from './phases';
import { config, DEFAULTS } from './config';
import { planData, planLoaded, planDay, planEdit } from './plan';
import { movements, workouts, fitnessLoaded } from './fitness';
import { recipes, recipesLoaded } from './recipes';

export function resetAllStores(): void {
	const id = get(pid);

	// Reset auth-related
	profile.set(null);
	isProgram.set(true);

	// Reset day stores
	dayData.set(null);
	currentDay.set(0);
	currentDate.set(new Date());
	dayPhases.set({});

	// Reset rules
	rules.set({ model: 'buckets', rules: [] });

	// Reset phases
	phases.set({});
	phasesList.set([]);
	phaseTransitions.set([]);

	// Reset config to defaults
	config.set({ ...DEFAULTS });

	// Reset plan
	planData.set([]);
	planLoaded.set(false);
	planDay.set(1);
	planEdit.set({});

	// Reset fitness
	movements.set([]);
	workouts.set([]);
	fitnessLoaded.set(false);

	// Reset recipes
	recipes.set([]);
	recipesLoaded.set(false);

	// Clear localStorage caches
	if (typeof window === 'undefined') return;

	try {
		// Remove all scoped keys for this user
		if (id) {
			const keysToRemove: string[] = [];
			for (let i = localStorage.length - 1; i >= 0; i--) {
				const k = localStorage.key(i);
				if (k && k.startsWith(`aevum_${id}_`)) {
					keysToRemove.push(k);
				}
			}
			for (const k of keysToRemove) {
				try { localStorage.removeItem(k); } catch { /* noop */ }
			}
		}

		// Remove global cache keys
		const globalKeys = [
			'aevum_phases_cache',
			'aevum_config_cache',
			'aevum_fitness_cache',
			'aevum_recipes_cache',
			'aevum_fav_recipes',
		];
		for (const k of globalKeys) {
			try { localStorage.removeItem(k); } catch { /* noop */ }
		}
	} catch { /* noop */ }
}

/** Combined logout: resets all stores then clears auth. Use this instead of bare logout(). */
export function logoutAndReset(): void {
	resetAllStores();
	logout();
}
