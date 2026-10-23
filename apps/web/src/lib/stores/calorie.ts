/**
 * Calorie / TDEE helpers
 * Uses @aevum/shared for core TDEE calculation (single source of truth).
 */
import { get } from 'svelte/store';
import { profile, pid, K, type UserProfile } from './auth';
import { type DayData, currentDate } from './day';
import { phReg, phaseFor } from './phases';
import { cfg } from './config';
import { mifflinTDEE, dobToAge } from '@aevum/shared';
import { actFactors, actLabels } from './config';
import { dateStr } from '$lib/helpers/date';

/** Resolve activity factor from profile: accepts numeric factor or string label */
function resolveActivityFactor(act: string | number | undefined): number {
	if (act == null) return 1.55; // default: moderate
	const n = Number(act);
	if (!isNaN(n) && n > 0 && n < 10) return n; // already numeric factor
	// String label lookup
	const labels = actLabels();
	const factors = actFactors();
	const idx = labels.findIndex(l => l.toLowerCase() === String(act).toLowerCase());
	return factors[idx >= 0 ? idx : 2] ?? 1.55;
}

/** Mifflin-St Jeor TDEE — delegates to @aevum/shared.
 *  Uses profile.weight (start_weight). For current-weight TDEE, use liveTDEE(). */
export function mifflin(p: UserProfile): number {
	const age = p.dob ? dobToAge(p.dob) : (p.age ?? 30);
	const sex: 'm' | 'f' = (p.sex || 'm').toLowerCase() as 'm' | 'f';
	const factor = resolveActivityFactor(p.act);
	return mifflinTDEE(p.weight, p.height, age, sex, factor);
}

/** Rolling average weight from daily weigh-ins in localStorage.
 *  Iterates by date range (YYYY-MM-DD keys), not day numbers.
 *  Falls back to profile.weight (start_weight) if no weigh-ins found. */
export function rollingWeight(dayNum: number, prof?: UserProfile | null, windowDays?: number): number {
	const p = prof ?? get(profile);
	if (!p) return 0;
	const id = get(pid);
	if (!id) return p.weight;

	const win = windowDays ?? cfg('drift_review_days');
	const today = get(currentDate);
	let sum = 0;
	let count = 0;

	for (let i = win - 1; i >= 0; i--) {
		try {
			const d = new Date(today);
			d.setDate(d.getDate() - i);
			const ds = dateStr(d);
			const raw = localStorage.getItem(K(id, `day_${ds}`));
			if (!raw) continue;
			const dd = JSON.parse(raw) as DayData;
			const w = parseFloat(dd.weight);
			if (w > 0) { sum += w; count++; }
		} catch { continue; }
	}

	return count > 0 ? sum / count : p.weight;
}

/** Live TDEE using rolling average weight instead of start_weight */
export function liveTDEE(dayNum: number, prof?: UserProfile | null): number {
	const p = prof ?? get(profile);
	if (!p) return 0;
	const w = rollingWeight(dayNum, p);
	const clone = { ...p, weight: w };
	return mifflin(clone);
}

/** Stabilization TDEE (maintenance weight-based) */
export function stabTDEE(p: UserProfile): number {
	const stabW = p.stab_target_weight ?? p.weight;
	const clone = { ...p, weight: stabW };
	return mifflin(clone);
}

/** Stabilization target kcal (TDEE + buffer) */
export function stabTargetKcal(p: UserProfile): number {
	const tdee = stabTDEE(p);
	const buf = cfg('stab_buffer_kcal');
	return tdee + buf;
}

/** Effective target for a given phase.
 *  Simplified: post-program phases use liveTDEE (rolling weight).
 *  Program phases (activation, transition) keep fixed targets from rules.
 *  Complex target modes (ramp, bank, cut) disabled until rules are rebuilt. */
export function effectiveTarget(dayNum: number, p?: UserProfile | null): number {
	const prof = p ?? get(profile);
	if (!prof) return 0;

	const ph = phaseFor(dayNum, prof);
	const reg = phReg(ph.key);

	// Program phases with fixed targets from rules
	if (reg?.target_mode === 'fixed') {
		return reg.target_fixed_lo ?? prof.current_target_kcal ?? mifflin(prof);
	}

	// TDEE multiplier mode: liveTDEE * calorie_cut (e.g. 0.8 for 20% deficit)
	if (reg?.target_mode === 'tdee_mult') {
		const mult = reg.calorie_cut ?? 1;
		return Math.round(liveTDEE(dayNum, prof) * mult);
	}

	// Everything else: liveTDEE based on rolling average weight
	return Math.round(liveTDEE(dayNum, prof));
}

/** Calorie bank — DISABLED until calorie rules are rebuilt.
 *  Kept as export so callers don't break. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function calorieBank(_dayNum: number, _windowDays?: number): number {
	return 0;
}
