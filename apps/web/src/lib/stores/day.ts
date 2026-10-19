/**
 * Day store — current day data, load/save, totals.
 * Maps to currentDay/day/loadDay/saveDay/totals from index.html.
 */
import { writable, get } from 'svelte/store';
import { K, pid } from './auth';
import { api } from '$lib/api/client';

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

	api('save_day', { id, day: num, data: day }).catch(() => {});
}

/** Load a range of days from backend into localStorage */
export async function hydrateFromBackend(totalDays: number): Promise<void> {
	const id = get(pid);
	if (!id) return;

	try {
		const data = await api<{ days: Record<string, DayData> }>('load_days', { id, from: 1, to: totalDays });
		if (data?.days) {
			for (const [n, d] of Object.entries(data.days)) {
				const key = K(id, `day_${n}`);
				try { localStorage.setItem(key, JSON.stringify(d)); } catch { /* noop */ }
			}
		}
	} catch { /* noop */ }
}
