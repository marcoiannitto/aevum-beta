// v.1.0.0 2026-10-24 — #37c calorie bank pure functions

/**
 * Calorie bank computation — pure functions, no Svelte, no localStorage.
 * All logic operates on calendar dates (YYYY-MM-DD), never on dayNum.
 */

// ── Types ──

export interface DayRecord {
  date: string;        // YYYY-MM-DD
  intake: number;      // kcal eaten
  baseTarget: number;  // kcal target (pre-bank)
  phase: string;       // phase key stamped in day_json
  programId: string;   // program_id stamped in day_json
}

export interface BankOpts {
  windowDays: number;   // bank_window (default 7)
  clampLo: number;      // bank_clamp_lo as fraction of TDEE (default 0.60)
  clampHi: number;      // bank_clamp_hi as fraction of base target (default 1.30)
  creditCap: number;    // max underspend credit per day (default 200)
}

export const BANK_DEFAULTS: BankOpts = {
  windowDays: 7,
  clampLo: 0.60,
  clampHi: 1.30,
  creditCap: 200,
};

// ── Helpers ──

/** Parse YYYY-MM-DD to Date (midnight UTC) */
function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00Z');
}

/** YYYY-MM-DD string from Date */
function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Get date N days before `today` */
function daysAgo(today: string, n: number): string {
  const d = parseDate(today);
  d.setUTCDate(d.getUTCDate() - n);
  return fmtDate(d);
}

// ── Core ──

/**
 * Compute the bank adjustment for today.
 *
 * Looks at the last `windowDays` calendar days (excluding today).
 * Filters to same phase + program. Missing days are skipped (no penalty, no credit).
 * Overspend: full 1:1 penalty. Underspend: capped at creditCap per day.
 *
 * Returns the raw adjustment in kcal (positive = eat more, negative = eat less).
 */
export function computeBank(
  history: DayRecord[],
  today: string,
  currentPhase: string,
  currentProgramId: string,
  opts: BankOpts = BANK_DEFAULTS,
): number {
  const windowStart = daysAgo(today, opts.windowDays);

  // Build a lookup by date for fast access
  const byDate = new Map<string, DayRecord>();
  for (const rec of history) {
    byDate.set(rec.date, rec);
  }

  let sum = 0;

  for (let i = 1; i <= opts.windowDays; i++) {
    const date = daysAgo(today, i);
    if (date < windowStart) break;

    const rec = byDate.get(date);
    if (!rec) continue; // missing day: skip (treated as on-target)

    // Only count days in the same phase and program
    if (rec.phase !== currentPhase || rec.programId !== currentProgramId) continue;

    const delta = rec.baseTarget - rec.intake;

    if (delta > 0) {
      // Underspend: credit capped
      sum += Math.min(delta, opts.creditCap);
    } else {
      // Overspend: full penalty (delta is negative)
      sum += delta;
    }
  }

  return Math.round(sum);
}

/**
 * Clamp the effective target between safety floor and ceiling.
 *
 * floor = tdee * clampLo (e.g. 60% of TDEE)
 * ceiling = baseTarget * clampHi (e.g. 130% of base target)
 */
export function clampTarget(
  baseTarget: number,
  bankAdj: number,
  tdee: number,
  clampLo: number = BANK_DEFAULTS.clampLo,
  clampHi: number = BANK_DEFAULTS.clampHi,
): number {
  const raw = baseTarget + bankAdj;
  const floor = Math.round(tdee * clampLo);
  const ceiling = Math.round(baseTarget * clampHi);
  return Math.round(Math.max(floor, Math.min(ceiling, raw)));
}

/**
 * Should the bank be active right now?
 *
 * Returns false when:
 * - Phase has no bank (phaseHasBank = false)
 * - Still in ramp portion of ramp_then_hold
 * - Within grace period from program start
 */
export function bankActive(
  today: string,
  programStartDate: string,
  graceDays: number,
  phaseHasBank: boolean,
  isRampPortion: boolean,
): boolean {
  if (!phaseHasBank) return false;
  if (isRampPortion) return false;

  // Grace period check
  if (graceDays > 0 && programStartDate) {
    const start = parseDate(programStartDate);
    const now = parseDate(today);
    const diffMs = now.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (diffDays < graceDays) return false;
  }

  return true;
}

/**
 * Weekly verdict: compare intake vs base targets for a Mon-Sun window.
 *
 * Skips missing days from both sums. Returns null if no logged days.
 */
export function weeklyVerdict(
  history: DayRecord[],
  weekStartDate: string, // Monday YYYY-MM-DD
  tolerance: number = 0.10,
): 'surplus' | 'deficit' | 'on_target' | null {
  const start = parseDate(weekStartDate);

  // Build date lookup
  const byDate = new Map<string, DayRecord>();
  for (const rec of history) {
    byDate.set(rec.date, rec);
  }

  let sumIntake = 0;
  let sumBase = 0;
  let logged = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const ds = fmtDate(d);
    const rec = byDate.get(ds);
    if (!rec) continue;

    sumIntake += rec.intake;
    sumBase += rec.baseTarget;
    logged++;
  }

  if (logged === 0 || sumBase === 0) return null;

  const ratio = sumIntake / sumBase;

  if (ratio > 1 + tolerance) return 'surplus';
  if (ratio < 1 - tolerance) return 'deficit';
  return 'on_target';
}
