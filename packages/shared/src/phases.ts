/**
 * Phase determination logic — single source of truth.
 *
 * FIXED: The old phaseFor() was stateless and used the CURRENT phase_mode
 * for all historical days, causing retroactive relabeling.
 *
 * This version supports a phase_transitions list so historical phases
 * are computed from the day each transition actually happened.
 */

import { PH_FIXED, DEFAULT_ACTIVATION_DAYS } from './constants.js';
import type { PhaseKey, PhaseMode } from './constants.js';
import type { Profile, PhaseTransition } from './types.js';

/** Minimum profile fields needed for phase calculation */
export interface PhaseProfile {
  activation_days?: number | null;
  phase_mode?: PhaseMode | null;
  loading_days?: number | null;
  transition_days?: number | null;
  stabilization_days?: number | null;
}

/** Get the number of activation days for a profile */
export function activationDays(profile: PhaseProfile): number {
  const a = Number(profile.activation_days);
  return a > 0 ? a : DEFAULT_ACTIVATION_DAYS;
}

/** Total days in the Reset block (loading + activation + transition) */
export function resetDayCount(profile: PhaseProfile): number {
  return PH_FIXED.loading + activationDays(profile) + PH_FIXED.transition;
}

/**
 * Determine which phase a given day number falls in.
 *
 * Without transitions: uses profile.phase_mode for post-stabilization
 * (the old behavior — still works for simple cases).
 *
 * With transitions: looks up which phase_mode was active on that day.
 */
export function phaseFor(
  day: number,
  profile: PhaseProfile,
  transitions?: PhaseTransition[]
): PhaseKey {
  const loading = profile.loading_days ?? PH_FIXED.loading;
  const actDays = activationDays(profile);
  const transition = profile.transition_days ?? PH_FIXED.transition;
  const stabilization = profile.stabilization_days ?? PH_FIXED.stabilization;

  if (day <= loading) return 'loading';
  if (day <= loading + actDays) return 'activation';
  if (day <= loading + actDays + transition) return 'transition';
  if (day <= loading + actDays + transition + stabilization) return 'stabilization';

  // Post-stabilization: use transitions if available
  if (transitions && transitions.length > 0) {
    // Find the last transition on or before this day
    const sorted = [...transitions].sort((a, b) => a.day - b.day);
    let mode: PhaseKey = 'maintenance'; // default
    for (const t of sorted) {
      if (t.day <= day) {
        mode = t.to_phase;
      } else {
        break;
      }
    }
    return mode;
  }

  // Fallback: current phase_mode from profile
  return (profile.phase_mode as PhaseKey) || 'maintenance';
}

/**
 * Phase lens — returns the phase boundaries for rendering phase bars.
 * Each entry: { phase, from, to }
 */
export interface PhaseBand {
  phase: PhaseKey;
  from: number;
  to: number;
}

export function phaseBands(
  totalDays: number,
  profile: PhaseProfile,
  transitions?: PhaseTransition[]
): PhaseBand[] {
  const bands: PhaseBand[] = [];
  let prev: PhaseKey | null = null;
  let bandStart = 1;

  for (let d = 1; d <= totalDays; d++) {
    const ph = phaseFor(d, profile, transitions);
    if (ph !== prev) {
      if (prev !== null) {
        bands.push({ phase: prev, from: bandStart, to: d - 1 });
      }
      prev = ph;
      bandStart = d;
    }
  }
  if (prev !== null) {
    bands.push({ phase: prev, from: bandStart, to: totalDays });
  }
  return bands;
}
