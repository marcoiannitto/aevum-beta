/**
 * Day store — current day data, load/save, totals.
 * Storage key: K(userId, `day_${YYYY-MM-DD}`) — date is the identity.
 * Day number is a derived display value from program_start_date.
 */
import { writable, get } from 'svelte/store';
import { K, pid, profile } from './auth';
import { api } from '$lib/api/client';
import { phaseFor, phasesLoaded } from './phases';
import { programDayNum, dateStr, effToday } from '$lib/helpers/date';

/**
 * "aevum" as a phase key is always wrong (it's a program, not a phase).
 * Maintenance/recomposition/keto as phase keys are valid for 0-phase programs.
 */
function isInvalidPhase(phase: string): boolean {
	return phase === 'aevum';
}

// --- Date helper (kept for backward compat) ---

/** Compute calendar date (YYYY-MM-DD) for a given day number from profile.start_date */
export function dateForDay(dayNum: number): string {
	const p = get(profile);
	const sd = p?.start_date;
	if (!sd) return '';
	const d = new Date(sd);
	d.setDate(d.getDate() + dayNum - 1); // day 1 = start_date
	return dateStr(d);
}

// --- localStorage migration ---

/** One-time migration from day-number keys to date keys */
export function migrateToDateKeys(): void {
	const id = get(pid);
	const p = get(profile) as Record<string, unknown> | null;
	if (!id || !p) return;

	const migKey = K(id, 'storage_migrated_v2');
	try { if (localStorage.getItem(migKey)) return; } catch { return; }

	const sd = p.start_date as string;
	if (!sd) {
		// No start_date — nothing to migrate
		try { localStorage.setItem(migKey, '1'); } catch { /* noop */ }
		return;
	}

	const startDate = new Date(sd + 'T00:00:00');
	if (isNaN(startDate.getTime())) {
		try { localStorage.setItem(migKey, '1'); } catch { /* noop */ }
		return;
	}

	// Scan old day_N keys (up to 500 days)
	for (let d = 1; d <= 500; d++) {
		const oldKey = K(id, `day_${d}`);
		try {
			const raw = localStorage.getItem(oldKey);
			if (!raw) continue;

			const dd = JSON.parse(raw) as DayData;

			// Compute date for this day number
			let dk = dd.date;
			if (!dk) {
				const dt = new Date(startDate);
				dt.setDate(dt.getDate() + d - 1);
				dk = dateStr(dt);
				dd.date = dk;
			}

			const newKey = K(id, `day_${dk}`);
			// Don't overwrite if date-keyed data already exists (it's newer)
			if (!localStorage.getItem(newKey)) {
				localStorage.setItem(newKey, JSON.stringify(dd));
			}

			// Also migrate timestamp
			const tsOld = K(id, `day_${d}_ts`);
			const tsNew = K(id, `day_${dk}_ts`);
			const tsRaw = localStorage.getItem(tsOld);
			if (tsRaw && !localStorage.getItem(tsNew)) {
				localStorage.setItem(tsNew, tsRaw);
			}
		} catch { continue; }
	}

	try { localStorage.setItem(migKey, '1'); } catch { /* noop */ }
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
				// Max retries exceeded — drop to avoid infinite loop
				console.warn('[AEVUM] sync retry exhausted for date', entry.payload.date);
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
	/** Phase key stamped at first save. Immutable once set. */
	phase?: string;
	/** Program ID stamped at first save. Immutable once set. */
	program_id?: string;
	/** Effective target kcal (base + bank), stamped on every save. */
	effective_target?: number;
	/** Base target kcal (pre-bank), stamped on every save. */
	base_target?: number;
}

// --- Stores ---

/** The calendar date the user is viewing. Source of truth. */
export const currentDate = writable<Date>(new Date());

/** Program-relative day number (derived from currentDate + program_start_date). 0 if no program. */
export const currentDay = writable<number>(0);

export const dayData = writable<DayData | null>(null);
export const dayPhases = writable<Record<number, string>>({});

// --- Helpers ---

export function blankDay(ds?: string): DayData {
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
		date: ds || '',
	};
}

/** Load day data by calendar date string (YYYY-MM-DD). Primary entry point. */
export function loadDay(dayNum: number): void {
	// dayNum is now the program-relative day, but storage is by date
	const id = get(pid);
	const date = get(currentDate);
	const ds = dateStr(date);

	currentDay.set(dayNum);
	if (!id) { dayData.set(blankDay(ds)); return; }

	const key = K(id, `day_${ds}`);
	try {
		const raw = localStorage.getItem(key);
		if (raw) {
			const parsed = JSON.parse(raw) as DayData;
			// Ensure date field is set
			if (!parsed.date) parsed.date = ds;
			dayData.set(parsed);
		} else {
			dayData.set(blankDay(ds));
		}
	} catch {
		dayData.set(blankDay(ds));
	}

	// Remember last viewed date
	try { localStorage.setItem(K(id, 'lastDay'), ds); } catch { /* noop */ }
}

/** Navigate to a calendar date. Sets currentDate + computes program day number. */
export function loadDate(date: Date): void {
	currentDate.set(date);
	const dayNum = programDayNum(date);
	loadDay(dayNum || 1);
}

/** Optional target stamper. Set by the app shell to avoid circular imports (day ↔ calorie). */
let _targetStamper: ((dayNum: number) => { effective: number; base: number }) | null = null;
export function setTargetStamper(fn: (dayNum: number) => { effective: number; base: number }): void {
	_targetStamper = fn;
}

export function saveDay(silent = false): void {
	const id = get(pid);
	const day = get(dayData);
	const num = get(currentDay);
	if (!id || !day) return;

	// Ensure date is set (from currentDate, not computed from day number)
	if (!day.date) day.date = dateStr(get(currentDate));

	// Stamp phase on first save, but only if phases have loaded.
	// Also re-stamp if "aevum" was incorrectly stored as phase (bug fix).
	if (get(phasesLoaded)) {
		if (!day.phase || isInvalidPhase(day.phase)) {
			day.phase = phaseFor(num, get(profile)).key;
		}
	}

	// Stamp program_id on first save (immutable once set)
	if (!day.program_id) {
		const p = get(profile) as Record<string, unknown> | null;
		day.program_id = (p?.program_id as string) || 'aevum';
	}

	// Stamp calorie targets on every save (for historical accuracy)
	if (_targetStamper) {
		const targets = _targetStamper(num);
		day.effective_target = targets.effective;
		day.base_target = targets.base;
	}

	const ds = day.date;
	const key = K(id, `day_${ds}`);
	const tsKey = K(id, `day_${ds}_ts`);
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

	// F-2: never sync a blank day (no meals, no weight, no water)
	const hasMeals = day.meals && day.meals.length > 0;
	const hasWeight = day.weight && +day.weight > 0;
	const hasWater = day.water && +day.water > 0;
	if (!hasMeals && !hasWeight && !hasWater) return;

	// Ensure date is set
	if (!day.date) day.date = dateStr(get(currentDate));

	// Stamp phase (same logic as saveDay: wait for phases, fix program-ID stamps)
	if (get(phasesLoaded)) {
		if (!day.phase || isInvalidPhase(day.phase)) {
			day.phase = phaseFor(num, get(profile)).key;
		}
	}

	// Stamp program_id (same logic as saveDay)
	if (!day.program_id) {
		const prof = get(profile) as Record<string, unknown> | null;
		day.program_id = (prof?.program_id as string) || 'aevum';
	}

	const t = totals(day);
	const payload: Record<string, unknown> = {
		date: day.date,          // primary key (YYYY-MM-DD)
		day: num,                // program day number (informational)
		phase: day.phase,
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
		energy: day.energy ?? '',
		hunger: day.hunger ?? '',
		sleep: day.sleep ?? '',
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
		const data = await api<{ days: { day: number; day_json: string; updated_at: string; phase: string; date?: string }[] }>('getdays');
		if (data?.days) {
			for (const row of data.days) {
				if (!row.day_json) continue;
				try {
					const parsed = JSON.parse(row.day_json) as DayData;

					// Determine date key: prefer row.date, then parsed.date, then compute from day number
					let dk = row.date || parsed.date;
					if (!dk && row.day) dk = dateForDay(row.day);
					if (!dk) continue; // can't key without a date

					// Ensure date field in parsed data
					if (!parsed.date) parsed.date = dk;
					// Backfill phase from DB column if not in day_json (pre-fix data)
					if (!parsed.phase && row.phase) parsed.phase = row.phase;

					const key = K(id, `day_${dk}`);
					const tsKey = K(id, `day_${dk}_ts`);
					const serverTs = Number(row.updated_at) || 0;

					// Compare timestamps: only overwrite if server is newer
					const localTs = Number(localStorage.getItem(tsKey)) || 0;
					if (localTs > 0 && localTs >= serverTs) continue;

					localStorage.setItem(key, JSON.stringify(parsed));
					localStorage.setItem(tsKey, String(serverTs));
				} catch { /* skip malformed rows */ }
			}
			// Reload current day from refreshed localStorage
			loadDate(get(currentDate));
		}
		// After successful hydrate, flush any pending syncs
		flushSyncQueue();
	} catch (err) { console.error('[AEVUM] hydrateFromBackend failed:', (err as Error).message || err); }
}
