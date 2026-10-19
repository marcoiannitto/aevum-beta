/**
 * Calorie / TDEE helpers
 * Mirrors mifflin(), stabTDEE(), stabTargetKcal(), reviewTarget(), calorie bank from index.html
 */
import { get } from 'svelte/store';
import { profile, type UserProfile } from './auth';
import { phReg, phaseFor, type PhaseConfig } from './phases';
import { cfg } from './config';
import { dayData, totals, type DayData } from './day';
import { K, pid } from './auth';

/** Mifflin-St Jeor TDEE: (10*kg + 6.25*cm - 5*age + sex_offset) * activity */
export function mifflin(p: UserProfile): number {
	const sexOffset = p.sex === 'F' ? -161 : 5;
	const age = p.age ?? calcAge(p.dob);
	const bmr = 10 * p.weight + 6.25 * p.height - 5 * age + sexOffset;

	const factors = [1.2, 1.375, 1.55, 1.725, 1.9];
	const labels = ['sedentary', 'light', 'moderate', 'active', 'extra'];
	const idx = labels.indexOf((p.act || 'moderate').toLowerCase());
	const factor = factors[idx >= 0 ? idx : 2];

	return Math.round(bmr * factor);
}

function calcAge(dob?: string): number {
	if (!dob) return 30;
	const d = new Date(dob);
	const now = new Date();
	let age = now.getFullYear() - d.getFullYear();
	const m = now.getMonth() - d.getMonth();
	if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
	return age;
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
			const base = mifflin(prof);
			return Math.round(base - (reg.calorie_cut ?? 0));
		}
		case 'ramp': {
			const from = reg.ramp_from ?? mifflin(prof);
			const to = mifflin(prof);
			const rampDays = reg.ramp_days ?? 14;
			const pct = Math.min(dayNum / rampDays, 1);
			return Math.round(from + (to - from) * pct);
		}
		case 'adaptive':
			return prof.current_target_kcal ?? mifflin(prof);
		default:
			return prof.current_target_kcal ?? prof.need ?? mifflin(prof);
	}
}

/** Calorie bank: rolling average of surplus/deficit over window */
export function calorieBank(dayNum: number, windowDays?: number): number {
	const id = get(pid);
	if (!id) return 0;

	const prof = get(profile);
	const win = windowDays ?? cfg('bank_window');
	const clampLo = cfg('bank_clamp_lo');
	const clampHi = cfg('bank_clamp_hi');

	let sum = 0;
	let count = 0;

	for (let d = Math.max(1, dayNum - win); d < dayNum; d++) {
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
