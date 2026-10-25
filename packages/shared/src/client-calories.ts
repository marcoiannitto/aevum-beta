// v.1.1.0 2026-10-25 -- #69 fix kcal null, bank history baseTarget, verdict per-day target, add debug fields
/**
 * Pure function to compute a single user's calorie status from raw DB data.
 * No Svelte, no localStorage, no browser APIs.
 * Used by the admin_client_calories endpoint.
 */

import { mifflinTDEE, dobToAge } from './calories.js';
import { phaseFor } from './phases.js';
import { computeBank, clampTarget, bankActive, weeklyVerdict, BANK_DEFAULTS } from './calorie-bank.js';
import type { DayRecord, BankOpts } from './calorie-bank.js';
import type { PhaseProfile } from './phases.js';

// ── Input types ──

export interface CalorieProfile {
  id: string;
  name: string;
  sex: string | null;
  dob: string | null;
  age: number | null;
  height: number;
  start_weight: number;
  activity: number;
  program_id: string;
  start_date: string | null;
  activation_days: number | null;
  loading_days: number | null;
  transition_days: number | null;
  stabilization_days: number | null;
  phase_mode: string | null;
  current_target_kcal: number | null;
}

export interface CalorieLog {
  day: number;
  date: string;
  phase: string | null;
  weight: number | null;
  kcal: number | null;  // null = no log, 0 = logged zero
  day_json: string | null;
}

export interface CaloriePhaseConfig {
  key: string;
  program_id: string | null;
  target_mode: string | null;
  calorie_mode: string | null;
  calorie_cut: number | null;
  calorie_bank: number | null;
  bank_window: number | null;
  bank_clamp_lo: number | null;
  bank_clamp_hi: number | null;
  bank_grace_days: number | null;
  weekly_tolerance: number | null;
  ramp_from: number | null;
  ramp_days: number | null;
  target_fixed_lo: number | null;
  target_fixed_hi: number | null;
}

// ── Output ──

export interface ClientCalorieStatus {
  userId: string;
  name: string;
  programId: string;
  phase: string;
  dayNum: number;
  tdee: number;
  baseTarget: number;
  bankAdj: number;
  effectiveTarget: number;
  lastIntake: number | null;
  lastLogDate: string | null;
  loggedDays: number;
  verdict: 'surplus' | 'deficit' | 'on_target' | null;
  isBankActive: boolean;
  // Debug fields (temporary, to diagnose phase config issues)
  _targetMode: string | null;
  _phaseConfigKey: string | null;
}

// ── Helpers ──

/** Program day number from start_date and today */
function programDayNum(startDate: string, today: string): number {
  const s = new Date(startDate + 'T00:00:00Z');
  const t = new Date(today + 'T00:00:00Z');
  return Math.floor((t.getTime() - s.getTime()) / 86_400_000) + 1;
}

/** Rolling average weight from recent logs, fallback to start_weight */
function rollingWeight(logs: CalorieLog[], windowDays: number, startWeight: number): number {
  const withWeight = logs
    .filter(l => l.weight != null && l.weight > 0)
    .sort((a, b) => b.day - a.day)
    .slice(0, windowDays);

  if (withWeight.length === 0) return startWeight;
  return withWeight.reduce((s, l) => s + l.weight!, 0) / withWeight.length;
}

/** Compute TDEE from profile + rolling weight */
function computeTDEE(profile: CalorieProfile, logs: CalorieLog[]): number {
  const w = rollingWeight(logs, 7, profile.start_weight);
  const age = profile.dob ? dobToAge(profile.dob) : (profile.age ?? 30);
  const sex: 'm' | 'f' = ((profile.sex || 'm').toLowerCase()) as 'm' | 'f';
  const act = profile.activity || 1.55;
  return mifflinTDEE(w, profile.height, age, sex, act);
}

/** Days into the current phase (1-indexed) */
function dayInPhase(dayNum: number, profile: PhaseProfile): number {
  const currentPhase = phaseFor(dayNum, profile);
  for (let d = dayNum - 1; d >= 1; d--) {
    if (phaseFor(d, profile) !== currentPhase) return dayNum - d;
  }
  return dayNum;
}

/** Compute base target (Layer 1) from phase config */
function computeBase(
  dayNum: number,
  tdee: number,
  profile: CalorieProfile,
  phaseConfig: CaloriePhaseConfig | null,
): number {
  if (!phaseConfig) return tdee;

  if (phaseConfig.target_mode === 'fixed') {
    return phaseConfig.target_fixed_lo ?? profile.current_target_kcal ?? tdee;
  }

  if (phaseConfig.target_mode === 'tdee_mult') {
    const mult = phaseConfig.calorie_cut ?? 1;
    return Math.round(tdee * mult);
  }

  if (phaseConfig.target_mode === 'ramp_then_hold') {
    const rampDays = phaseConfig.ramp_days ?? 4;
    const holdMult = phaseConfig.calorie_cut ?? 0.9;
    const holdTarget = Math.round(tdee * holdMult);
    const rampFrom = phaseConfig.ramp_from ?? 400;

    const dip = dayInPhase(dayNum, profile as PhaseProfile);
    if (dip <= rampDays) {
      const progress = dip / rampDays;
      return Math.round(rampFrom + (holdTarget - rampFrom) * progress);
    }
    return holdTarget;
  }

  // Fallback: no target_mode set, use TDEE
  return Math.round(tdee);
}

// ── Main export ──

/**
 * Compute calorie status for one user from raw DB data.
 * All inputs are plain objects, no Svelte, no localStorage.
 */
export function computeClientCalories(
  profile: CalorieProfile,
  logs: CalorieLog[],
  phases: CaloriePhaseConfig[],
  today: string,
): ClientCalorieStatus {
  // Day number
  const dayNum = profile.start_date
    ? programDayNum(profile.start_date, today)
    : 0;

  // Current phase
  const phase = dayNum > 0
    ? phaseFor(dayNum, profile as PhaseProfile)
    : (profile.phase_mode || 'loading');

  // Find matching phase config (program-specific first, then fallback)
  const phaseConfig = phases.find(p => p.key === phase && (
    p.program_id === profile.program_id || p.program_id == null
  )) ?? phases.find(p => p.key === phase) ?? null;

  // TDEE
  const tdee = computeTDEE(profile, logs);

  // Base target
  const baseTarget = computeBase(dayNum, tdee, profile, phaseConfig);

  // Bank
  let bankAdj = 0;
  let bankIsActive = false;

  if (phaseConfig && phaseConfig.calorie_bank) {
    const windowDays = phaseConfig.bank_window ?? BANK_DEFAULTS.windowDays;
    const graceDays = phaseConfig.bank_grace_days ?? 3;
    const isRamp = phaseConfig.target_mode === 'ramp_then_hold'
      && dayNum > 0
      && dayInPhase(dayNum, profile as PhaseProfile) <= (phaseConfig.ramp_days ?? 4);

    bankIsActive = bankActive(
      today,
      profile.start_date || '',
      graceDays,
      true,
      isRamp,
    );

    if (bankIsActive) {
      // Build DayRecord history from logs (exclude today)
      // Use each log's own baseTarget via computeBase with that log's day number
      const history: DayRecord[] = logs
        .filter(l => l.date && l.date < today)
        .map(l => ({
          date: l.date,
          intake: l.kcal ?? 0,
          baseTarget: computeBase(l.day, tdee, profile, phaseConfig),
          phase: l.phase || phase,
          programId: profile.program_id || 'aevum',
        }));

      const opts: BankOpts = {
        windowDays,
        clampLo: phaseConfig.bank_clamp_lo ?? BANK_DEFAULTS.clampLo,
        clampHi: phaseConfig.bank_clamp_hi ?? BANK_DEFAULTS.clampHi,
        creditCap: BANK_DEFAULTS.creditCap,
      };

      bankAdj = computeBank(history, today, phase, profile.program_id || 'aevum', opts);
    }
  }

  // Effective target
  const effectiveTarget = bankAdj !== 0
    ? clampTarget(
        baseTarget,
        bankAdj,
        tdee,
        phaseConfig?.bank_clamp_lo ?? BANK_DEFAULTS.clampLo,
        phaseConfig?.bank_clamp_hi ?? BANK_DEFAULTS.clampHi,
      )
    : baseTarget;

  // Last intake: find most recent log with actual kcal data
  const sorted = [...logs].sort((a, b) => b.day - a.day);
  const lastLog = sorted[0] ?? null;
  // Show actual kcal if present, null if no log or kcal is null
  const lastIntake = lastLog && lastLog.kcal != null ? lastLog.kcal : null;

  // Weekly verdict (last 7 days)
  // Use per-day baseTarget via computeBase for each log
  const mondayOffset = new Date(today + 'T00:00:00Z').getUTCDay();
  const mondayDate = new Date(today + 'T00:00:00Z');
  mondayDate.setUTCDate(mondayDate.getUTCDate() - ((mondayOffset + 6) % 7));
  const weekStart = mondayDate.toISOString().slice(0, 10);

  const verdictHistory: DayRecord[] = logs
    .filter(l => l.date && l.kcal != null)
    .map(l => ({
      date: l.date,
      intake: l.kcal!,
      baseTarget: computeBase(l.day, tdee, profile, phaseConfig),
      phase: l.phase || phase,
      programId: profile.program_id || 'aevum',
    }));

  const tolerance = phaseConfig?.weekly_tolerance ?? 0.10;
  const verdict = weeklyVerdict(verdictHistory, weekStart, tolerance);

  return {
    userId: profile.id,
    name: profile.name,
    programId: profile.program_id || 'aevum',
    phase,
    dayNum: Math.max(dayNum, 0),
    tdee,
    baseTarget,
    bankAdj,
    effectiveTarget,
    lastIntake,
    lastLogDate: lastLog?.date ?? null,
    loggedDays: logs.filter(l => l.kcal != null).length,
    verdict,
    isBankActive: bankIsActive,
    _targetMode: phaseConfig?.target_mode ?? null,
    _phaseConfigKey: phaseConfig?.key ?? null,
  };
}
