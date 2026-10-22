/**
 * Phase Registry store — data-driven phase config from API
 * Uses @aevum/shared phaseFor() as single source of truth for phase calculation.
 */
import { writable, get } from 'svelte/store';
import { api } from '$lib/api/client';
import { profile, isProgram } from './auth';
import { currentProgramId } from './programs';
import {
	phaseFor as sharedPhaseFor,
	activationDays as sharedActivationDays,
	PH_FIXED,
} from '@aevum/shared';
import type { PhaseTransition } from '@aevum/shared';

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
	program_id: string | null;
	explainer: Record<string, unknown>;
	[key: string]: unknown;
}

export const phases = writable<Record<string, PhaseConfig>>({});
export const phasesList = writable<PhaseConfig[]>([]);
export const phaseTransitions = writable<PhaseTransition[]>([]);

const CACHE_KEY = 'aevum_phases_cache';
const CACHE_VER_KEY = 'aevum_phases_cache_v';
const CACHE_VERSION = 2; // bump when phases schema changes (fix #32)

function applyPhases(arr: PhaseConfig[], programId?: string) {
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

	// Filter phasesList to only the current program's phases
	const pid = programId || currentProgramId();
	const list = arr
		.filter((p) => !!p.is_program && (p.program_id === pid || (!p.program_id && pid === 'aevum')))
		.sort((a, b) => a.sort_order - b.sort_order)
		.map((p) => map[p.key]);

	phases.set(map);
	phasesList.set(list);
}

/** Re-filter phasesList for a different program (called on program switch) */
export function filterPhasesForProgram(programId: string) {
	const $phases = get(phases);
	const all = Object.values($phases);
	const list = all
		.filter((p) => !!p.is_program && (p.program_id === programId || (!p.program_id && programId === 'aevum')))
		.sort((a, b) => a.sort_order - b.sort_order);
	phasesList.set(list);
}

export function loadPhases() {
	// Load from cache first — skip if cache version is stale (fix #32)
	if (typeof window !== 'undefined') {
		const ver = localStorage.getItem(CACHE_VER_KEY);
		if (ver !== String(CACHE_VERSION)) {
			localStorage.removeItem(CACHE_KEY);
		} else {
			const c = localStorage.getItem(CACHE_KEY);
			if (c) {
				try { applyPhases(JSON.parse(c)); } catch { /* noop */ }
			}
		}
	}

	api<{ phases: PhaseConfig[] }>('phases', {}, { contentType: 'text/plain;charset=utf-8' })
		.then((d) => {
			if (d?.phases && Array.isArray(d.phases)) {
				localStorage.setItem(CACHE_KEY, JSON.stringify(d.phases));
				localStorage.setItem(CACHE_VER_KEY, String(CACHE_VERSION));
				applyPhases(d.phases);
			}
		})
		.catch((err) => { console.error('[AEVUM] loadPhases failed:', err.message || err); });

	// Fetch phase transitions for the logged-in user
	api<{ transitions: PhaseTransition[] }>('phase_transitions')
		.then((d) => {
			if (d?.transitions && Array.isArray(d.transitions)) {
				phaseTransitions.set(d.transitions);
			}
		})
		.catch((err) => { console.error('[AEVUM] loadPhaseTransitions failed:', err.message || err); });
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
	const $transitions = get(phaseTransitions);

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
				// Post-program: use shared phaseFor with transitions support
				const key = sharedPhaseFor(dayNum, {
					activation_days: (p as Record<string, unknown>)?.activation_days as number,
					phase_mode: (p as Record<string, unknown>)?.phase_mode as string,
					loading_days: (p as Record<string, unknown>)?.loading_days as number,
					transition_days: (p as Record<string, unknown>)?.transition_days as number,
					stabilization_days: (p as Record<string, unknown>)?.stabilization_days as number,
				}, $transitions.length > 0 ? $transitions : undefined);
				const reg = $phases[key];
				if (reg) {
					return { key, name: reg.name, color: key === 'maintenance' ? MAINT_COLOR : reg.color };
				}
				return { key, name: key.charAt(0).toUpperCase() + key.slice(1), color: MAINT_COLOR };
			}
		}
		// Past all program phases — use shared phaseFor with transitions
		const key = sharedPhaseFor(dayNum, {
			activation_days: (p as Record<string, unknown>)?.activation_days as number,
			phase_mode: (p as Record<string, unknown>)?.phase_mode as string,
			loading_days: (p as Record<string, unknown>)?.loading_days as number,
			transition_days: (p as Record<string, unknown>)?.transition_days as number,
			stabilization_days: (p as Record<string, unknown>)?.stabilization_days as number,
		}, $transitions.length > 0 ? $transitions : undefined);
		const chosen = $phases[key] ?? $list[$list.length - 1];
		return { key: chosen?.key ?? key, name: chosen?.name ?? key, color: key === 'maintenance' ? MAINT_COLOR : (chosen?.color ?? MAINT_COLOR) };
	}

	// Fallback: use shared phaseFor (correct phase logic with transitions support)
	const key = sharedPhaseFor(dayNum, {
		activation_days: (p as Record<string, unknown>)?.activation_days as number,
		phase_mode: (p as Record<string, unknown>)?.phase_mode as string,
		loading_days: (p as Record<string, unknown>)?.loading_days as number,
		transition_days: (p as Record<string, unknown>)?.transition_days as number,
		stabilization_days: (p as Record<string, unknown>)?.stabilization_days as number,
	}, $transitions.length > 0 ? $transitions : undefined);

	const FALLBACK_COLORS: Record<string, string> = {
		loading: '#8a8a8a',
		activation: '#B08D2E',
		transition: '#B08D2E',
		stabilization: '#4a463f',
		maintenance: MAINT_COLOR,
		recomposition: '#6B4E8B',
		tracker: MAINT_COLOR,
	};
	const FALLBACK_NAMES: Record<string, string> = {
		loading: 'Loading',
		activation: 'Activation',
		transition: 'Transition',
		stabilization: 'Stabilization',
		maintenance: 'Maintenance',
		recomposition: 'Recomposition',
		tracker: 'Tracking',
	};

	return {
		key,
		name: FALLBACK_NAMES[key] ?? key.charAt(0).toUpperCase() + key.slice(1),
		color: FALLBACK_COLORS[key] ?? MAINT_COLOR,
	};
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

	const actDays = p && +(p.activation_days as number) > 0
		? +(p.activation_days as number)
		: sharedActivationDays({});

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
		loading: dur('loading', PH_FIXED.loading),
		activation: actDays,
		transition: dur('transition', PH_FIXED.transition),
		stabilization: dur('stabilization', PH_FIXED.stabilization)
	};
}

export function totalDays(prof?: Record<string, unknown> | null): number {
	const L = phaseLens(prof);
	return Object.values(L).reduce((s, v) => s + v, 0);
}

const POST_PROGRAM_PHASES = new Set(['maintenance', 'recomposition', 'tracker']);

export function inPostProgram(dayNum: number, prof?: Record<string, unknown> | null): boolean {
	const k = phaseFor(dayNum, prof).key;
	return POST_PROGRAM_PHASES.has(k);
}
