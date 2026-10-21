/**
 * Calorie / TDEE helpers
 * Uses @aevum/shared for core TDEE calculation (single source of truth).
 */
import { get } from 'svelte/store';
import { profile, type UserProfile } from './auth';
import { phReg, phaseFor, type PhaseConfig } from './phases';
import { cfg } from './config';
import { dayData, totals, type DayData } from './day';
import { K, pid } from './auth';
import { mifflinTDEE, dobToAge } from '@aevum/shared';
import { actFactors, actLabels } from './config';

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
 *  Falls back to profile.weight (start_weight) if no weigh-ins found. */
export function rollingWeight(dayNum: number, prof?: UserProfile | null, windowDays?: number): number {
	const p = prof ?? get(profile);
	if (!p) return 0;
	const id = get(pid);
	if (!id) return p.weight;

	const win = windowDays ?? cfg('drift_review_days');
	let sum = 0;
	let count = 0;

	for (let d = Math.max(1, dayNum - win + 1); d <= dayNum; d++) {
		try {
			const raw = localStorage.getItem(K(id, `day_${d}`));
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

/** Effective target for a given phase */
export function effectiveTarget(dayNum: number, p?: UserProfile | null): number {
	const prof = p ?? get(profile);
	if (!prof) return 0;

	const ph = phaseFor(dayNum, prof);
	const reg = phReg(ph.key);

	if (!reg) {
		return prof.current_target_kcal ?? prof.need ?? mifflin(prof);
	}

	switch (reg.target_mode) {
		case 'mifflin':
			return mifflin(prof);
		case 'stab_tdee':
			return stabTDEE(prof);
		case 'stab_target':
			return stabTargetKcal(prof);
		case 'cut': {
			const base = liveTDEE(dayNum, prof);
			return Math.round(base - (reg.calorie_cut ?? 0));
		}
		case 'ramp': {
			const from = reg.ramp_from ?? liveTDEE(dayNum, prof);
			const to = liveTDEE(dayNum, prof);
			const rampDays = reg.ramp_days ?? 14;
			const pct = Math.min(dayNum / rampDays, 1);
			return Math.round(from + (to - from) * pct);
		}
		case 'tdee_mult':
			return Math.round(liveTDEE(dayNum, prof) * (reg.calorie_cut ?? 1));
		case 'ramp_then_hold': {
			const from = reg.ramp_from ?? liveTDEE(dayNum, prof);
			const to = liveTDEE(dayNum, prof);
			const rampDays = reg.ramp_days ?? 14;
			const pct = Math.min(dayNum / rampDays, 1);
			const ramped = Math.round(from + (to - from) * pct);
			// After ramp completes, hold at TDEE * calorie_cut
			return pct >= 1 ? Math.round(to * (reg.calorie_cut ?? 1)) : ramped;
		}
		case 'adaptive':
			return prof.current_target_kcal ?? mifflin(prof);
		default:
			return prof.current_target_kcal ?? prof.need ?? mifflin(prof);
	}
}

/** Calorie bank: rolling average of surplus/deficit over window.
 *  Reads bank config from the current phase (not global config).
 *  Window is bounded to current phase only (never crosses phase boundaries). */
export function calorieBank(dayNum: number, windowDays?: number): number {
	const id = get(pid);
	if (!id) return 0;

	const prof = get(profile);
	const currentPhase = phaseFor(dayNum, prof);
	const reg = phReg(currentPhase.key);

	// Read per-phase bank config; fall back to global cfg only if phase has no value
	const win = windowDays ?? reg?.bank_window ?? cfg('bank_window');
	const clampLo = reg?.bank_clamp_lo ?? cfg('bank_clamp_lo');
	const clampHi = reg?.bank_clamp_hi ?? cfg('bank_clamp_hi');

	if (win <= 0) return 0;

	let sum = 0;
	let count = 0;

	for (let d = Math.max(1, dayNum - win); d < dayNum; d++) {
		// Only include days that belong to the SAME phase
		const dayPhase = phaseFor(d, prof);
		if (dayPhase.key !== currentPhase.key) continue;

		try {
			const raw = localStorage.getItem(K(id, `day_${d}`));
			if (!raw) continue;
			const dd = JSON.parse(raw) as DayData;
			const t = totals(dd);
			const target = effectiveTarget(d, prof);
			if (target > 0) {
				sum += t.kcal - target;
				count++;
			}
		} catch { continue; }
	}

	if (count === 0) return 0;
	const avg = sum / count;

	// Clamp as ratio of current target
	const curTarget = effectiveTarget(dayNum, prof);
	const lo = curTarget * (clampLo - 1); // e.g. -0.15 * target
	const hi = curTarget * (clampHi - 1); // e.g. +0.15 * target
	return Math.round(Math.max(lo, Math.min(hi, avg)));
}
