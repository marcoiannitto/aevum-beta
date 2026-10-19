/**
 * Day store — current day data, load/save, totals.
 * Maps to currentDay/day/loadDay/saveDay/totals from index.html.
 */
import { writable, get } from 'svelte/store';
import { K, pid, profile } from './auth';
import { api } from '$lib/api/client';
import { phaseFor } from './phases';

// --- Types ---

export interface MealEntry {
	name: string;
	kcal: number;
	protein: number;
	fat: number;
	carbs: number;
	time: string;
	ts: number;
	grams?: number;
	items?: unknown[];
	[key: string]: unknown;
}

export interface ExerciseEntry {
	name: string;
	kcal: number;
	mins: number;
}

export interface DayData {
	meals: MealEntry[];
	water: number;
	weight: string;
	waist: string;
	serumAM: boolean;
	serumPM: boolean;
	exercise: ExerciseEntry[];
	energy: number;
	hunger: number;
	sleep: number;
	notes: string;
	date: string;
}

// --- Stores ---

export const currentDay = writable<number>(1);
export const dayData = writable<DayData | null>(null);
export const dayPhases = writable<Record<number, string>>({});

// --- Helpers ---

export function blankDay(): DayData {
	return {
		meals: [],
		water: 0,
		weight: '',
		waist: '',
		serumAM: false,
		serumPM: false,
		exercise: [],
		energy: 0,
		hunger: 0,
		sleep: 0,
		notes: '',
		date: '',
	};
}

export function loadDay(dayNum: number): void {
	const id = get(pid);
	currentDay.set(dayNum);
	if (!id) { dayData.set(blankDay()); return; }

	const key = K(id, `day_${dayNum}`);
	try {
		const raw = localStorage.getItem(key);
		if (raw) {
			const parsed = JSON.parse(raw) as DayData;
			dayData.set(parsed);
		} else {
			dayData.set(blankDay());
		}
	} catch {
		dayData.set(blankDay());
	}

	// Remember last viewed day
	try { localStorage.setItem(K(id, 'lastDay'), String(dayNum)); } catch { /* noop */ }
}

export function saveDay(silent = false): void {
	const id = get(pid);
	const day = get(dayData);
	const num = get(currentDay);
	if (!id || !day) return;

	const key = K(id, `day_${num}`);
	try {
		localStorage.setItem(key, JSON.stringify(day));
	} catch { /* noop */ }
}

export interface DayTotals {
	kcal: number;
	protein: number;
	fat: number;
	carbs: number;
	exKcal: number;
}

export function totals(d: DayData): DayTotals {
	let kcal = 0, protein = 0, fat = 0, carbs = 0, exKcal = 0;
	for (const m of d.meals) {
		kcal += +(m.kcal || 0);
		protein += +(m.protein || 0);
		fat += +(m.fat || 0);
		carbs += +(m.carbs || 0);
	}
	for (const e of d.exercise) {
		exKcal += +(e.kcal || 0);
	}
	return { kcal, protein, fat, carbs, exKcal };
}

/** Sync current day to backend */
export function syncDay(): void {
	const id = get(pid);
	const day = get(dayData);
	const num = get(currentDay);
	if (!id || !day) return;

	const t = totals(day);
	api('sync', {
		day: num,
		phase: phaseFor(num, get(profile)).key,
		date: day.date || '',
		weight: day.weight || null,
		waist: day.waist || null,
		serumAM: day.serumAM,
		serumPM: day.serumPM,
		kcal: t.kcal,
		protein: t.protein,
		fat: t.fat,
		carbs: t.carbs,
		water_ml: (day.water || 0) * 250,
		exercise: JSON.stringify(day.exercise || []),
		exercise_kcal: t.exKcal,
		energy: day.energy || '',
		hunger: day.hunger || '',
		sleep: day.sleep || '',
		notes: day.notes || '',
		day_json: JSON.stringify(day),
		updated_at: Date.now(),
	}).catch((err) => { console.error('[AEVUM] syncDay failed:', err.message || err); });
}

/** Load all days from backend into localStorage */
export async function hydrateFromBackend(_totalDays?: number): Promise<void> {
	const id = get(pid);
	if (!id) return;

	try {
		const data = await api<{ days: { day: number; day_json: string; updated_at: string; phase: string }[] }>('getdays');
		if (data?.days) {
			for (const row of data.days) {
				if (!row.day_json) continue;
				try {
					const parsed = JSON.parse(row.day_json) as DayData;
					const key = K(id, `day_${row.day}`);
					localStorage.setItem(key, JSON.stringify(parsed));
				} catch { /* skip malformed rows */ }
			}
			// Reload current day from refreshed localStorage
			loadDay(get(currentDay));
		}
	} catch (err) { console.error('[AEVUM] hydrateFromBackend failed:', (err as Error).message || err); }
}
