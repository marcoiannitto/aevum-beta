// v.1.0.0 2026-10-24 — #37e calorie bank tests
import { describe, it, expect } from 'vitest';
import {
  computeBank,
  clampTarget,
  bankActive,
  weeklyVerdict,
  BANK_DEFAULTS,
} from '../src/calorie-bank.js';
import type { DayRecord } from '../src/calorie-bank.js';

// ── Helpers ──

function rec(date: string, intake: number, baseTarget: number, phase = 'maintenance', programId = 'aevum'): DayRecord {
  return { date, intake, baseTarget, phase, programId };
}

// ── computeBank ──

describe('computeBank', () => {
  it('returns 0 for empty history', () => {
    expect(computeBank([], '2026-10-10', 'maintenance', 'aevum')).toBe(0);
  });

  it('returns 0 when all days missing in window', () => {
    // History exists but outside the window
    const history = [rec('2026-09-01', 1800, 2000)];
    expect(computeBank(history, '2026-10-10', 'maintenance', 'aevum')).toBe(0);
  });

  it('credits underspend capped at creditCap (200)', () => {
    // Ate 1500, target 2000 => delta 500, capped at 200
    const history = [rec('2026-10-09', 1500, 2000)];
    expect(computeBank(history, '2026-10-10', 'maintenance', 'aevum')).toBe(200);
  });

  it('penalizes overspend at full 1:1', () => {
    // Ate 2300, target 2000 => delta -300
    const history = [rec('2026-10-09', 2300, 2000)];
    expect(computeBank(history, '2026-10-10', 'maintenance', 'aevum')).toBe(-300);
  });

  it('sums multiple days correctly', () => {
    const history = [
      rec('2026-10-09', 1800, 2000), // underspend 200, capped at 200
      rec('2026-10-08', 2100, 2000), // overspend 100, penalty -100
      rec('2026-10-07', 1900, 2000), // underspend 100, capped at 100
    ];
    // 200 + (-100) + 100 = 200
    expect(computeBank(history, '2026-10-10', 'maintenance', 'aevum')).toBe(200);
  });

  it('skips missing days (no penalty)', () => {
    // Only day 09 exists in a 7-day window
    const history = [rec('2026-10-09', 1800, 2000)];
    expect(computeBank(history, '2026-10-10', 'maintenance', 'aevum')).toBe(200);
  });

  it('filters by phase', () => {
    const history = [
      rec('2026-10-09', 2500, 2000, 'stabilization'), // wrong phase
      rec('2026-10-08', 1800, 2000, 'maintenance'),    // right phase
    ];
    // Only day 08 counts: underspend 200, capped at 200
    expect(computeBank(history, '2026-10-10', 'maintenance', 'aevum')).toBe(200);
  });

  it('filters by programId', () => {
    const history = [
      rec('2026-10-09', 2500, 2000, 'maintenance', 'keto'),   // wrong program
      rec('2026-10-08', 1800, 2000, 'maintenance', 'aevum'),   // right
    ];
    expect(computeBank(history, '2026-10-10', 'maintenance', 'aevum')).toBe(200);
  });

  it('respects custom windowDays', () => {
    const history = [
      rec('2026-10-09', 1800, 2000), // 1 day ago
      rec('2026-10-07', 1800, 2000), // 3 days ago, outside window of 2
    ];
    const opts = { ...BANK_DEFAULTS, windowDays: 2 };
    // Only day 09 is within window
    expect(computeBank(history, '2026-10-10', 'maintenance', 'aevum', opts)).toBe(200);
  });

  it('respects custom creditCap', () => {
    const history = [rec('2026-10-09', 1500, 2000)]; // delta 500
    const opts = { ...BANK_DEFAULTS, creditCap: 100 };
    expect(computeBank(history, '2026-10-10', 'maintenance', 'aevum', opts)).toBe(100);
  });

  it('excludes today from the window', () => {
    const history = [
      rec('2026-10-10', 500, 2000),  // today, should be excluded
      rec('2026-10-09', 1800, 2000), // yesterday
    ];
    expect(computeBank(history, '2026-10-10', 'maintenance', 'aevum')).toBe(200);
  });
});

// ── clampTarget ──

describe('clampTarget', () => {
  it('returns base + bank when within bounds', () => {
    expect(clampTarget(2000, 100, 2200)).toBe(2100);
  });

  it('clamps to floor (60% of TDEE)', () => {
    // base 2000, bank -1500 => 500, floor = 2200 * 0.6 = 1320
    expect(clampTarget(2000, -1500, 2200)).toBe(1320);
  });

  it('clamps to ceiling (130% of base)', () => {
    // base 2000, bank +1000 => 3000, ceiling = 2000 * 1.3 = 2600
    expect(clampTarget(2000, 1000, 2200)).toBe(2600);
  });

  it('respects custom clamp values', () => {
    // floor = 2200 * 0.5 = 1100, ceiling = 2000 * 1.5 = 3000
    expect(clampTarget(2000, -1500, 2200, 0.5, 1.5)).toBe(1100);
    expect(clampTarget(2000, 1500, 2200, 0.5, 1.5)).toBe(3000);
  });
});

// ── bankActive ──

describe('bankActive', () => {
  it('returns false when phase has no bank', () => {
    expect(bankActive('2026-10-10', '2026-09-01', 3, false, false)).toBe(false);
  });

  it('returns false during ramp portion', () => {
    expect(bankActive('2026-10-10', '2026-09-01', 3, true, true)).toBe(false);
  });

  it('returns false within grace period', () => {
    // Program started 2026-10-09, today is 2026-10-10, grace = 3 days
    // diffDays = 1, < 3 => false
    expect(bankActive('2026-10-10', '2026-10-09', 3, true, false)).toBe(false);
  });

  it('returns true after grace period', () => {
    // Program started 2026-10-06, today is 2026-10-10, grace = 3
    // diffDays = 4, >= 3 => true
    expect(bankActive('2026-10-10', '2026-10-06', 3, true, false)).toBe(true);
  });

  it('returns true on exact grace boundary', () => {
    // diffDays = 3, >= 3 => true
    expect(bankActive('2026-10-10', '2026-10-07', 3, true, false)).toBe(true);
  });

  it('returns true with grace = 0', () => {
    expect(bankActive('2026-10-10', '2026-10-10', 0, true, false)).toBe(true);
  });
});

// ── weeklyVerdict ──

describe('weeklyVerdict', () => {
  it('returns null for no logged days', () => {
    expect(weeklyVerdict([], '2026-10-07')).toBeNull();
  });

  it('returns on_target when within tolerance', () => {
    const history = [
      rec('2026-10-07', 2000, 2000),
      rec('2026-10-08', 2050, 2000),
      rec('2026-10-09', 1950, 2000),
    ];
    // sum intake = 6000, sum base = 6000, ratio = 1.0
    expect(weeklyVerdict(history, '2026-10-07')).toBe('on_target');
  });

  it('returns surplus when over tolerance', () => {
    const history = [
      rec('2026-10-07', 2500, 2000),
      rec('2026-10-08', 2400, 2000),
    ];
    // sum intake = 4900, sum base = 4000, ratio = 1.225 > 1.10
    expect(weeklyVerdict(history, '2026-10-07')).toBe('surplus');
  });

  it('returns deficit when under tolerance', () => {
    const history = [
      rec('2026-10-07', 1600, 2000),
      rec('2026-10-08', 1500, 2000),
    ];
    // sum intake = 3100, sum base = 4000, ratio = 0.775 < 0.90
    expect(weeklyVerdict(history, '2026-10-07')).toBe('deficit');
  });

  it('skips days outside the 7-day window', () => {
    const history = [
      rec('2026-10-07', 2000, 2000),
      rec('2026-10-20', 5000, 2000), // way outside, ignored
    ];
    expect(weeklyVerdict(history, '2026-10-07')).toBe('on_target');
  });

  it('handles exactly on tolerance boundary as on_target', () => {
    // ratio = 1.10 exactly, with tolerance 0.10 => 1.10 is NOT > 1.10
    const history = [rec('2026-10-07', 2200, 2000)];
    expect(weeklyVerdict(history, '2026-10-07')).toBe('on_target');
  });

  it('handles custom tolerance', () => {
    const history = [rec('2026-10-07', 2100, 2000)];
    // ratio = 1.05, tolerance 0.03 => 1.05 > 1.03 => surplus
    expect(weeklyVerdict(history, '2026-10-07', 0.03)).toBe('surplus');
  });

  it('returns null when sumBase is 0', () => {
    const history = [rec('2026-10-07', 2000, 0)];
    expect(weeklyVerdict(history, '2026-10-07')).toBeNull();
  });
});
