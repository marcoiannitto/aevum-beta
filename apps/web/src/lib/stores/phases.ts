/**
 * Phase Registry store — data-driven phase config from API
 * Mirrors the PHASES/PHASES_LIST/loadPhases/phaseFor logic from index.html
 */
import { writable, get } from 'svelte/store';
import { api } from '$lib/api/client';
import { profile, isProgram } from './auth';

export interface PhaseConfig {
	key: string;
	name: string;
	sort_order: number;
	color: string;
	duration_default: number | null;
	duration_col: string | null;
	is_program: boolean;
	gate_fat: boolean;
	gate_carb: boolean;
	use_buckets: boolean;
	requires_serum: boolean;
	has_fasting: boolean;
	calorie_bank: boolean;
	show_in_phase_bar: boolean;
	show_in_recipe_chips: boolean;
	drift_enabled: boolean;
	target_mode: string;
	calorie_mode: string;
	calorie_cut: number | null;
	ramp_from: number | null;
	ramp_days: number | null;
	ramp_pct: string | null;
	_ramp_pct: number[] | null;
	bank_window: number | null;
	bank_clamp_lo: number | null;
	bank_clamp_hi: number | null;
	drift_review_days: number | null;
	drift_step_kcal: number | null;
	drift_band_kg: number | null;
	drift_floor_kcal: number | null;
	inherits_rules_from: string | null;
	food_rule_line: string | null;
	fitness_intro: string | null;
	explainer: Record<string, unknown>;
	[key: string]: unknown;
}

export const phases = writable<Record<string, PhaseConfig>>({});
export const phasesList = writable<PhaseConfig[]>([]);

const CACHE_KEY = 'aevum_phases_cache';

function applyPhases(arr: PhaseConfig[]) {
	const map: Record<string, PhaseConfig> = {};
	arr.forEach((p) => {
		const o: PhaseConfig = {
			...p,
			gate_fat: !!p.gate_fat,
			gate_carb: !!p.gate_carb,
			use_buckets: !!p.use_buckets,
			is_program: !!p.is_program,
			requires_serum: !!p.requires_serum,
			has_fasting: !!p.has_fasting,
			calorie_bank: !!p.calorie_bank,
			show_in_phase_bar: !!p.show_in_phase_bar,
			show_in_recipe_chips: !!p.show_in_recipe_chips,
			drift_enabled: !!p.drift_enabled,
			explainer: {},
			_ramp_pct: null
		};
		try { o.explainer = JSON.parse((p as Record<string, unknown>).explainer_json as string || '{}'); } catch { o.explainer = {}; }
		try { o._ramp_pct = JSON.parse(p.ramp_pct || 'null'); } catch { o._ramp_pct = null; }
		map[p.key] = o;
	});

	const list = arr
		.filter((p) => !!p.is_program)
		.sort((a, b) => a.sort_order - b.sort_order)
		.map((p) => map[p.key]);

	phases.set(map);
	phasesList.set(list);
}

export function loadPhases() {
	// Load from cache first
	if (typeof window !== 'undefined') {
		const c = localStorage.getItem(CACHE_KEY);
		if (c) {
			try { applyPhases(JSON.parse(c)); } catch { /* noop */ }
		}
	}

	api<{ phases: PhaseConfig[] }>('phases', {}, { contentType: 'text/plain;charset=utf-8' })
		.then((d) => {
			if (d?.phases && Array.isArray(d.phases)) {
				localStorage.setItem(CACHE_KEY, JSON.stringify(d.phases));
				applyPhases(d.phases);
			}
		})
		.catch(() => {});
}

/** Look up a phase by key */
export function phReg(key: string): PhaseConfig | null {
	return get(phases)[key] ?? null;
}

/** Resolve phase key for rules inheritance */
export function ruleParent(key: string): string {
	const ph = phReg(key);
	return ph?.inherits_rules_from ?? key;
}

const MAINT_COLOR = '#3E7A6A';

export interface PhaseInfo {
	key: string;
	name: string;
	color: string;
}

/** Determine which phase a given day number falls in */
export function phaseFor(dayNum: number, prof?: Record<string, unknown> | null): PhaseInfo {
	const $isProgram = get(isProgram);
	const $phases = get(phases);
	const $list = get(phasesList);
	const p = prof ?? get(profile);

	if (!$isProgram) {
		const trk = $phases['tracker'];
		return { key: 'tracker', name: trk?.name ?? 'Tracking', color: trk?.color ?? MAINT_COLOR };
	}

	if ($list.length) {
		const lens = phaseLens(p);
		let cum = 0;
		for (const ph of $list) {
			const dur = lens[ph.key] ?? ph.duration_default ?? 0;
			if (dur) {
				cum += dur;
				if (dayNum <= cum) {
					return { key: ph.key, name: ph.name, color: ph.key === 'maintenance' ? MAINT_COLOR : ph.color };
				}
			} else {
				const mode = (p as Record<string, unknown>)?.phase_mode as string || 'maintenance';
				if (ph.key === mode) {
					return { key: ph.key, name: ph.name, color: ph.key === 'maintenance' ? MAINT_COLOR : ph.color };
				}
				continue;
			}
		}
		const mode = (p as Record<string, unknown>)?.phase_mode as string || 'maintenance';
		const chosen = $list.find((x) => x.key === mode) ?? $list[$list.length - 1];
		return { key: chosen.key, name: chosen.name, color: chosen.key === 'maintenance' ? MAINT_COLOR : chosen.color };
	}

	// Fallback: hardcoded
	const lens = phaseLens(p);
	const l1 = lens.loading ?? 2;
	const l2 = l1 + (lens.activation ?? 8);
	const l3 = l2 + (lens.transition ?? 3);
	const l4 = l3 + (lens.stabilization ?? 18);
	if (dayNum <= l1) return { key: 'loading', name: 'Loading', color: '#8a8a8a' };
	if (dayNum <= l2) return { key: 'activation', name: 'Activation', color: '#B08D2E' };
	if (dayNum <= l3) return { key: 'transition', name: 'Transition', color: '#B08D2E' };
	if (dayNum <= l4) return { key: 'stabilization', name: 'Stabilization', color: '#4a463f' };
	return { key: 'maintenance', name: 'Maintenance', color: MAINT_COLOR };
}

/** Calculate phase durations from profile + registry */
export function phaseLens(prof?: Record<string, unknown> | null): Record<string, number> {
	const $list = get(phasesList);
	const p = prof ?? get(profile);

	function dur(key: string, fallback: number): number {
		const ph = phReg(key);
		if (ph?.duration_col && p && p[ph.duration_col] != null && p[ph.duration_col] !== '') {
			return +(p[ph.duration_col] as number);
		}
		if (ph?.duration_default) return ph.duration_default;
		return fallback;
	}

	const actDays = p && +(p.activation_days as number) > 0 ? +(p.activation_days as number) : 8;

	if ($list.length) {
		const L: Record<string, number> = {};
		for (const ph of $list) {
			if (ph.key === 'activation') { L.activation = actDays; continue; }
			if (ph.duration_default || ph.duration_col) {
				L[ph.key] = dur(ph.key, ph.duration_default ?? 0);
			}
		}
		return L;
	}

	return {
		loading: dur('loading', 2),
		activation: actDays,
		transition: dur('transition', 3),
		stabilization: dur('stabilization', 18)
	};
}

export function totalDays(prof?: Record<string, unknown> | null): number {
	const L = phaseLens(prof);
	return Object.values(L).reduce((s, v) => s + v, 0);
}

export function inPostProgram(dayNum: number, prof?: Record<string, unknown> | null): boolean {
	const k = phaseFor(dayNum, prof).key;
	return k === 'maintenance' || k === 'recomposition' || k === 'tracker';
}
