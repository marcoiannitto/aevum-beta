/**
 * Config store — key-value pairs from API with local defaults.
 * Mirrors CONFIG/DEFAULTS/loadConfig/cfg/cfgStr/cfgd from index.html.
 */
import { writable, get } from 'svelte/store';
import { api } from '$lib/api/client';

export const DEFAULTS: Record<string, number | string> = {
	day_start_hour: 5,
	glass_ml: 250,
	meal_kcal: 250,
	meal_fat: 10,
	meal_carb: 15,
	bucket_cap: 200,
	portion_target: 6,
	bank_window: 4,
	bank_clamp_lo: 0.85,
	bank_clamp_hi: 1.15,
	drift_review_days: 7,
	drift_step_kcal: 50,
	drift_band_kg: 0.5,
	drift_floor_kcal: 800,
	stab_buffer_kcal: 200,
	activity_factors: '1.2,1.375,1.55,1.725,1.9',
	act_labels: 'Sedentary,Lightly Active,Moderately Active,Very Active,Extra Active'
};

const CACHE_KEY = 'aevum_config_cache';

export const config = writable<Record<string, string | number>>({ ...DEFAULTS });

function applyConfig(pairs: Array<{ key: string; value: string }>) {
	const merged: Record<string, string | number> = { ...DEFAULTS };
	for (const { key, value } of pairs) {
		merged[key] = value;
	}
	config.set(merged);
}

// Load cached overrides on init
if (typeof window !== 'undefined') {
	try {
		const cached = localStorage.getItem(CACHE_KEY);
		if (cached) applyConfig(JSON.parse(cached));
	} catch { /* noop */ }
}

/** Load config from backend */
export function loadConfig(): void {
	api<{ config?: Array<{ key: string; value: string }>; rows?: Array<{ key: string; value: string }> }>('config', {}, { contentType: 'text/plain;charset=utf-8' })
		.then((d) => {
			const arr = d?.config ?? d?.rows;
			if (arr && Array.isArray(arr)) {
				localStorage.setItem(CACHE_KEY, JSON.stringify(arr));
				applyConfig(arr);
			}
		})
		.catch(() => {});
}

/** Get numeric config value */
export function cfg(key: string): number {
	const v = get(config)[key];
	if (v == null) return typeof DEFAULTS[key] === 'number' ? DEFAULTS[key] as number : 0;
	return +v;
}

/** Get string config value */
export function cfgStr(key: string): string {
	const v = get(config)[key];
	return String(v ?? DEFAULTS[key] ?? '');
}

/** Get config with explicit default */
export function cfgd<T extends string | number>(key: string, def: T): T {
	const v = get(config)[key];
	if (v == null) return def;
	return (typeof def === 'number' ? +v : String(v)) as T;
}

/** DAY_START_HOUR shorthand */
export function dayStartHour(): number {
	return cfg('day_start_hour');
}

/** Activity factor labels */
export function actLabels(): string[] {
	return cfgStr('act_labels').split(',');
}

/** Activity factor values */
export function actFactors(): number[] {
	return cfgStr('activity_factors').split(',').map(Number);
}
