import { describe, it, expect } from 'vitest';
import { findRule, bandStatus, isAlcohol, deriveCompliance, computeStats } from '../src/compliance.js';
import type { Rule, DayLog, DayJsonItem } from '../src/types.js';

const sampleRules: Rule[] = [
  { phase: 'activation', model: 'macros', metric: 'kcal', basis: 'fixed', value: 650, green_lo: 550, green_hi: 750, amber_lo: 500, amber_hi: 800, gated: 'yes', unit: 'kcal' },
  { phase: 'activation', model: 'macros', metric: 'protein', basis: 'fixed', value: 90, green_lo: 90, green_hi: null, amber_lo: 70, amber_hi: null, gated: 'yes', unit: 'g' },
  { phase: 'activation', model: 'all', metric: 'alcohol', basis: 'none', value: null, green_lo: null, green_hi: null, amber_lo: null, amber_hi: null, gated: 'yes', unit: '' },
];

describe('findRule', () => {
  it('finds matching rule', () => {
    const r = findRule(sampleRules, 'activation', 'kcal', 'macros');
    expect(r).not.toBeNull();
    expect(r!.value).toBe(650);
  });

  it('falls back to all model', () => {
    const r = findRule(sampleRules, 'activation', 'alcohol', 'macros');
    expect(r).not.toBeNull();
    expect(r!.metric).toBe('alcohol');
  });

  it('transition falls back to activation', () => {
    const r = findRule(sampleRules, 'transition', 'kcal', 'macros');
    expect(r).not.toBeNull();
    expect(r!.value).toBe(650);
  });

  it('returns null when no match', () => {
    expect(findRule(sampleRules, 'loading', 'kcal', 'macros')).toBeNull();
  });

  it('normalizes consolidation to stabilization', () => {
    const stabRules: Rule[] = [
      { phase: 'stabilization', model: 'all', metric: 'kcal', basis: 'adaptive_kcal', value: null, green_lo: 90, green_hi: 115, amber_lo: 80, amber_hi: 125, gated: 'yes', unit: 'kcal' },
    ];
    const r = findRule(stabRules, 'consolidation', 'kcal', 'all');
    expect(r).not.toBeNull();
  });
});

describe('bandStatus', () => {
  const rule: Rule = {
    phase: 'activation', model: 'macros', metric: 'kcal', basis: 'fixed',
    value: 650, green_lo: 550, green_hi: 750, amber_lo: 500, amber_hi: 800,
    gated: 'yes', unit: 'kcal',
  };

  it('green when within green band', () => {
    expect(bandStatus(650, rule)).toBe('green');
    expect(bandStatus(550, rule)).toBe('green');
    expect(bandStatus(750, rule)).toBe('green');
  });

  it('amber when outside green but inside amber', () => {
    expect(bandStatus(520, rule)).toBe('amber');
    expect(bandStatus(780, rule)).toBe('amber');
  });

  it('red when outside amber', () => {
    expect(bandStatus(499, rule)).toBe('red');
    expect(bandStatus(801, rule)).toBe('red');
  });

  it('none when null value or no rule', () => {
    expect(bandStatus(null, rule)).toBe('none');
    expect(bandStatus(500, null)).toBe('none');
  });
});

describe('isAlcohol', () => {
  it('detects alcohol by category', () => {
    expect(isAlcohol({ category: 'alcohol', name: 'Red' })).toBe(true);
  });

  it('detects alcohol by name', () => {
    expect(isAlcohol({ name: 'glass of wine' })).toBe(true);
    expect(isAlcohol({ name: 'beer 500ml' })).toBe(true);
  });

  it('detects alcohol in note', () => {
    expect(isAlcohol({ name: 'drink', note: 'contains alcohol' })).toBe(true);
  });

  it('does not flag non-alcohol', () => {
    expect(isAlcohol({ name: 'chicken breast' })).toBe(false);
  });
});

describe('computeStats', () => {
  it('computes correct aggregate stats', () => {
    const data: DayLog[] = [
      { user_id: 'u1', day: 1, phase: 'activation', date: '2026-01-01', weight: 80, waist: null, serum_am: null, serum_pm: null, kcal: 600, protein: 90, fat: 20, carbs: 25, water_ml: 2000, exercise: null, exercise_kcal: null, energy: null, hunger: null, sleep: null, notes: null, day_json: null, updated_at: null },
      { user_id: 'u1', day: 2, phase: 'activation', date: '2026-01-02', weight: 79.5, waist: null, serum_am: null, serum_pm: null, kcal: 550, protein: 85, fat: 18, carbs: 28, water_ml: 1800, exercise: 'walk', exercise_kcal: 200, energy: null, hunger: null, sleep: null, notes: null, day_json: null, updated_at: null },
    ];
    const compliance = [
      { day: 1, date: '2026-01-01', phase: 'activation', status: 'green' as const, issues: [] },
      { day: 2, date: '2026-01-02', phase: 'activation', status: 'amber' as const, issues: [{ type: 'protein', sev: 'amber' as const, detail: 'Protein: 85g' }] },
    ];
    const stats = computeStats(data, compliance);
    expect(stats.startWeight).toBe(80);
    expect(stats.endWeight).toBe(79.5);
    expect(stats.delta).toBe(-0.5);
    expect(stats.totalDays).toBe(2);
    expect(stats.scoredDays).toBe(2);
    expect(stats.redFreeDays).toBe(2);
    expect(stats.compliancePct).toBe(100);
    expect(stats.exerciseDays).toBe(1);
    expect(stats.avgKcal).toBe(575);
  });
});
