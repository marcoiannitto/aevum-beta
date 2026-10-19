/**
 * Fitness store — movements + workouts from API.
 * Maps to FITNESS/loadFitness/fitRoutines from index.html.
 */
import { writable, get } from 'svelte/store';
import { api } from '$lib/api/client';

export interface Movement {
	id: string;
	name: string;
	video_url?: string;
	description?: string;
	[key: string]: unknown;
}

export interface WorkoutRow {
	workout_id: string;
	workout_name: string;
	phase: string;
	duration_min: number;
	order: number;
	movement_id: string;
	sets: number;
	reps: number;
	rest_sec: number;
}

export interface Routine {
	id: string;
	name: string;
	phase: string;
	duration: number;
	steps: { order: number; movement_id: string; sets: number; reps: number; rest: number }[];
}

export const movements = writable<Movement[]>([]);
export const workouts = writable<WorkoutRow[]>([]);
export const fitnessLoaded = writable(false);

const CACHE_KEY = 'aevum_fitness_cache';

export async function loadFitness(): Promise<void> {
	// Cache first
	try {
		const cached = localStorage.getItem(CACHE_KEY);
		if (cached) {
			const d = JSON.parse(cached);
			movements.set(d.movements || []);
			workouts.set(d.workouts || []);
			fitnessLoaded.set(true);
		}
	} catch { /* noop */ }

	try {
		const d = await api<{ movements: Movement[]; workouts: WorkoutRow[] }>('fitness', {}, { contentType: 'text/plain;charset=utf-8' });
		if (d && (d.movements || d.workouts)) {
			movements.set(d.movements || []);
			workouts.set(d.workouts || []);
			fitnessLoaded.set(true);
			localStorage.setItem(CACHE_KEY, JSON.stringify({ movements: d.movements, workouts: d.workouts }));
		}
	} catch { /* noop */ }
}

export function movementById(id: string): Movement | undefined {
	return get(movements).find(m => String(m.id) === String(id));
}

/** Build structured routines from raw workout rows */
export function fitRoutines(): Routine[] {
	const byId: Record<string, Routine> = {};
	for (const w of get(workouts)) {
		const id = String(w.workout_id || '').trim();
		if (!id) continue;
		if (!byId[id]) {
			byId[id] = { id, name: w.workout_name || id, phase: String(w.phase || 'all'), duration: +w.duration_min || 0, steps: [] };
		}
		byId[id].steps.push({ order: +w.order || 0, movement_id: String(w.movement_id || '').trim(), sets: +w.sets || 0, reps: +w.reps || 0, rest: +w.rest_sec || 0 });
	}
	const list = Object.values(byId);
	list.forEach(r => r.steps.sort((a, b) => a.order - b.order));
	return list;
}

/** Check if routine is a daily (no reps — just follow-along) */
export function isDailyRoutine(r: Routine): boolean {
	return r.steps.length > 0 && r.steps.every(s => s.reps === 0);
}

/** Filter routines by phase */
export function routinesForPhase(phaseKey: string): Routine[] {
	return fitRoutines().filter(r => {
		const t = String(r.phase).toLowerCase().split(/[,/|]/).map(s => s.trim());
		return t.includes('all') || t.includes(phaseKey);
	});
}
