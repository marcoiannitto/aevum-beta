/**
 * Day store — current day data, load/save, totals.
 * Maps to currentDay/day/loadDay/saveDay/totals from index.html.
 */
import { writable, get } from 'svelte/store';
import { K, pid, profile } from './auth';
import { api } from '$lib/api/client';
import { phaseFor } from './phases';
import { dateToDayNum, effToday } from '$lib/helpers/date';

// --- Date helper ---

/** Compute calendar date (YYYY-MM-DD) for a given day number from profile.start_date */
export function dateForDay(dayNum: number): string {
	const p = get(profile);
	const sd = p?.start_date;
	if (!sd) return '';
	const d = new Date(sd);
	d.setDate(d.getDate() + dayNum - 1); // day 1 = start_date
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${dd}`;
}

// --- Retry queue ---

interface PendingSync {
	payload: Record<string, unknown>;
	retries: number;
	nextRetryAt: number;
}

const SYNC_QUEUE_KEY = 'aevum_pending_syncs';
const MAX_RETRIES = 3;

function loadSyncQueue(): PendingSync[] {
	try {
		const raw = localStorage.getItem(SYNC_QUEUE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch { return []; }
}

function saveSyncQueue(queue: PendingSync[]): void {
	try { localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue)); } catch { /* noop */ }
}

async function flushSyncQueue(): Promise<void> {
	const queue = loadSyncQueue();
	if (!queue.length) return;
	const now = Date.now();
	const remaining: PendingSync[] = [];
	for (const entry of queue) {
		if (entry.nextRetryAt > now) { remaining.push(entry); continue; }
		try {
			await api('sync', entry.payload);
		} catch {
			entry.retries++;
			if (entry.retries < MAX_RETRIES) {
				entry.nextRetryAt = Date.now() + 1000 * Math.pow(2, entry.retries); // 2s, 4s, 8s
				remaining.push(entry);
			} else {
				// Keep for next session (reset retry counter, set nextRetryAt to 0)
				remaining.push({ ...entry, retries: 0, nextRetryAt: 0 });
			}
		}
	}
	saveSyncQueue(remaining);
}

function enqueueSyncRetry(payload: Record<string, unknown>): void {
	const queue = loadSyncQueue();
	queue.push({ payload, retries: 0, nextRetryAt: Date.now() + 1000 });
	saveSyncQueue(queue);
}

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

/** The calendar date the user is viewing. Source of truth. */
export const currentDate = writable<Date>(new Date());

/** Day number in the program (derived from currentDate + start_date). 0 if no program. */
export const currentDay = writable<number>(0);

export const dayData = writable<DayData | null>(null);
export const dayPhases = writable<Record<number, string>>({});

// --- Helpers ---

export function blankDay(dayNum?: number): DayData {
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
		date: dayNum != null ? dateForDay(dayNum) : '',
	};
}

export function loadDay(dayNum: number): void {
	const id = get(pid);
	currentDay.set(dayNum);
	if (!id) { dayData.set(blankDay(dayNum)); return; }

	const key = K(id, `day_${dayNum}`);
	try {
		const raw = localStorage.getItem(key);
		if (raw) {
			const parsed = JSON.parse(raw) as DayData;
			// Backfill date if missing from older cached data
			if (!parsed.date) parsed.date = dateForDay(dayNum);
			dayData.set(parsed);
		} else {
			dayData.set(blankDay(dayNum));
		}
	} catch {
		dayData.set(blankDay(dayNum));
	}

	// Remember last viewed day
	try { localStorage.setItem(K(id, 'lastDay'), String(dayNum)); } catch { /* noop */ }
}

/** Navigate to a calendar date. Sets currentDate + computes day number from start_date. */
export function loadDate(date: Date): void {
	currentDate.set(date);
	const dayNum = dateToDayNum(date);
	// dateToDayNum returns 0 when no start_date. Day data is keyed by day number,
	// so for free users (no program), key by days-since-first-open or just 1.
	loadDay(dayNum || 1);
}

export function saveDay(silent = false): void {
	const id = get(pid);
	const day = get(dayData);
	const num = get(currentDay);
	if (!id || !day) return;

	// Ensure date is computed if missing
	if (!day.date) day.date = dateForDay(num);

	const key = K(id, `day_${num}`);
	const tsKey = K(id, `day_${num}_ts`);
	try {
		localStorage.setItem(key, JSON.stringify(day));
		localStorage.setItem(tsKey, String(Date.now()));
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

	// Ensure date is computed if missing
	if (!day.date) day.date = dateForDay(num);

	const t = totals(day);
	const payload: Record<string, unknown> = {
		day: num,
		phase: phaseFor(num, get(profile)).key,
		date: day.date,
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
	};

	api('sync', payload)
		.then(() => { flushSyncQueue(); })
		.catch((err) => {
			console.error('[AEVUM] syncDay failed:', err.message || err);
			enqueueSyncRetry(payload);
		});
}

/** Load all days from backend into localStorage (only if server data is newer) */
export async function hydrateFromBackend(_totalDays?: number): Promise<void> {
	const id = get(pid);
	if (!id) return;

	try {
		const data = await api<{ days: { day: number; day_json: string; updated_at: string; phase: string }[] }>('getdays');
		if (data?.days) {
			for (const row of data.days) {
				if (!row.day_json) continue;
				try {
					const key = K(id, `day_${row.day}`);
					const tsKey = K(id, `day_${row.day}_ts`);
					const serverTs = Number(row.updated_at) || 0;

					// Compare timestamps: only overwrite if server is newer
					const localTs = Number(localStorage.getItem(tsKey)) || 0;
					if (localTs > 0 && localTs >= serverTs) continue;

					const parsed = JSON.parse(row.day_json) as DayData;
					// Backfill date if missing
					if (!parsed.date) parsed.date = dateForDay(row.day);
					localStorage.setItem(key, JSON.stringify(parsed));
					localStorage.setItem(tsKey, String(serverTs));
				} catch { /* skip malformed rows */ }
			}
			// Reload current day from refreshed localStorage
			loadDay(get(currentDay) || 1);
		}
		// After successful hydrate, flush any pending syncs
		flushSyncQueue();
	} catch (err) { console.error('[AEVUM] hydrateFromBackend failed:', (err as Error).message || err); }
}
