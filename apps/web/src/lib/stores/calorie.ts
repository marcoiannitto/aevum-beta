// v.3.3.0 2026-10-24 — #37c steps 7-8: weekly verdict badge + bank display
/**
 * Calorie / TDEE helpers
 * Uses @aevum/shared for core TDEE calculation (single source of truth).
 * Bank logic delegates to @aevum/shared pure functions.
 */
import { get } from 'svelte/store';
import { profile, pid, K, type UserProfile } from './auth';
import { type DayData, currentDate } from './day';
import { phReg, phaseFor } from './phases';
import { cfg } from './config';
import { currentProgramId } from './programs';
import { mifflinTDEE, dobToAge, computeBank, clampTarget, bankActive } from '@aevum/shared';
import type { DayRecord, BankOpts } from '@aevum/shared';
import { actFactors, actLabels } from './config';
import { dateStr, programDayNum } from '$lib/helpers/date';

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

/** Mifflin-St Jeor TDEE -- delegates to @aevum/shared.
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

/** Base target (Layer 1): daily kcal from TDEE + phase config, before bank adjustment.
 *  This is the pre-bank target that the bank compares against. */
export function baseTarget(dayNum: number, p?: UserProfile | null): number {
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

	// Ramp-then-hold: linear ramp from ramp_from to hold target over ramp_days
	if (reg?.target_mode === 'ramp_then_hold') {
		const rampDays = reg.ramp_days ?? 4;
		const holdMult = reg.calorie_cut ?? 0.9;
		const holdTarget = Math.round(liveTDEE(dayNum, prof) * holdMult);
		const rampFrom = reg.ramp_from ?? 400;

		// dayInPhase: how many days into this phase
		const dayInPhase = dayInCurrentPhase(dayNum, prof);

		if (dayInPhase <= rampDays) {
			// Linear ramp: from rampFrom to holdTarget over rampDays
			const progress = dayInPhase / rampDays;
			return Math.round(rampFrom + (holdTarget - rampFrom) * progress);
		}

		// Past ramp: hold at holdTarget
		return holdTarget;
	}

	// Everything else: liveTDEE based on rolling average weight
	return Math.round(liveTDEE(dayNum, prof));
}

/** How many days into the current phase (1-indexed) */
function dayInCurrentPhase(dayNum: number, prof: UserProfile): number {
	const ph = phaseFor(dayNum, prof);
	// Walk backward to find where this phase started
	for (let d = dayNum - 1; d >= 1; d--) {
		const prev = phaseFor(d, prof);
		if (prev.key !== ph.key) return dayNum - d;
	}
	return dayNum; // phase started at day 1
}

/** Build DayRecord history from localStorage for bank computation */
function buildHistory(windowDays: number): DayRecord[] {
	const id = get(pid);
	if (!id) return [];

	const today = get(currentDate);
	const records: DayRecord[] = [];

	for (let i = 1; i <= windowDays; i++) {
		try {
			const d = new Date(today);
			d.setDate(d.getDate() - i);
			const ds = dateStr(d);
			const raw = localStorage.getItem(K(id, `day_${ds}`));
			if (!raw) continue;

			const dd = JSON.parse(raw) as DayData;
			const kcal = (dd.meals || []).reduce((s, m) => s + (+(m.kcal || 0)), 0);

			// Compute base target for that day
			const dayNum = programDayNum(d);
			if (!dayNum) continue;
			const bt = baseTarget(dayNum);

			records.push({
				date: ds,
				intake: kcal,
				baseTarget: bt,
				phase: dd.phase || '',
				programId: dd.program_id || 'aevum',
			});
		} catch { continue; }
	}

	return records;
}

/** Bank adjustment (Layer 2): redistribution within a rolling window.
 *  Returns 0 when bank is not active for the current phase. */
export function bankAdjustment(dayNum: number): number {
	const prof = get(profile);
	if (!prof) return 0;

	const ph = phaseFor(dayNum, prof);
	const reg = phReg(ph.key);
	if (!reg) return 0;

	// Check if bank should be active
	const progId = currentProgramId();
	const psd = (prof as Record<string, unknown>).program_start_date as string
		|| (prof as Record<string, unknown>).start_date as string
		|| '';
	const graceDays = reg.bank_grace_days ?? 3;
	const todayStr = dateStr(get(currentDate));

	// Is the current day in the ramp portion of ramp_then_hold?
	const isRamp = reg.target_mode === 'ramp_then_hold'
		&& dayInCurrentPhase(dayNum, prof) <= (reg.ramp_days ?? 4);

	if (!bankActive(todayStr, psd, graceDays, !!reg.calorie_bank, isRamp)) {
		return 0;
	}

	const windowDays = reg.bank_window ?? 7;
	const opts: BankOpts = {
		windowDays,
		clampLo: reg.bank_clamp_lo ?? 0.60,
		clampHi: reg.bank_clamp_hi ?? 1.30,
		creditCap: 200,
	};

	const history = buildHistory(windowDays);
	return computeBank(history, todayStr, ph.key, progId, opts);
}

/** Effective target (Layer 1 + Layer 2): base target adjusted by bank.
 *  Same signature as before so callers don't need changes. */
export function effectiveTarget(dayNum: number, p?: UserProfile | null): number {
	const base = baseTarget(dayNum, p);
	const bank = bankAdjustment(dayNum);

	if (bank === 0) return base;

	const prof = p ?? get(profile);
	const tdee = liveTDEE(dayNum, prof);
	const ph = phaseFor(dayNum, prof);
	const reg = phReg(ph.key);

	return clampTarget(
		base,
		bank,
		tdee,
		reg?.bank_clamp_lo ?? 0.60,
		reg?.bank_clamp_hi ?? 1.30,
	);
}

/** Calorie bank value for UI display (tooltip, badge).
 *  Returns the raw bank adjustment (can be negative).
 *  Same signature as before so callers don't need changes. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function calorieBank(dayNum: number, _windowDays?: number): number {
	return bankAdjustment(dayNum);
}
