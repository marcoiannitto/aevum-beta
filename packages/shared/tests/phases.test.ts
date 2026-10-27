import { describe, it, expect } from 'vitest';
import { phaseFor, activationDays, resetDayCount, phaseBands } from '../src/phases.js';
import type { PhaseProfile } from '../src/phases.js';
import type { PhaseTransition } from '../src/types.js';

const defaultProfile: PhaseProfile = {
  activation_days: 8,
  phase_mode: 'maintenance',
};

describe('activationDays', () => {
  it('returns profile value when set', () => {
    expect(activationDays({ activation_days: 10 })).toBe(10);
  });

  it('defaults to 8 when null', () => {
    expect(activationDays({ activation_days: null })).toBe(8);
  });

  it('defaults to 8 when 0 or negative', () => {
    expect(activationDays({ activation_days: 0 })).toBe(8);
    expect(activationDays({ activation_days: -1 })).toBe(8);
  });
});

describe('resetDayCount', () => {
  it('returns loading + activation + transition', () => {
    // 2 + 8 + 3 = 13
    expect(resetDayCount(defaultProfile)).toBe(13);
  });

  it('adjusts for custom activation days', () => {
    expect(resetDayCount({ activation_days: 13 })).toBe(18); // 2 + 13 + 3
  });
});

describe('phaseFor', () => {
  it('loading: days 1-2', () => {
    expect(phaseFor(1, defaultProfile)).toBe('loading');
    expect(phaseFor(2, defaultProfile)).toBe('loading');
  });

  it('activation: days 3-10 (default 8 days)', () => {
    expect(phaseFor(3, defaultProfile)).toBe('activation');
    expect(phaseFor(10, defaultProfile)).toBe('activation');
  });

  it('transition: days 11-13', () => {
    expect(phaseFor(11, defaultProfile)).toBe('transition');
    expect(phaseFor(13, defaultProfile)).toBe('transition');
  });

  it('stabilization: days 14-31', () => {
    expect(phaseFor(14, defaultProfile)).toBe('stabilization');
    expect(phaseFor(31, defaultProfile)).toBe('stabilization');
  });

  it('maintenance after stabilization (default)', () => {
    expect(phaseFor(32, defaultProfile)).toBe('maintenance');
    expect(phaseFor(100, defaultProfile)).toBe('maintenance');
  });

  it('recomposition when phase_mode is set', () => {
    const recompProfile: PhaseProfile = { ...defaultProfile, phase_mode: 'recomposition' };
    expect(phaseFor(32, recompProfile)).toBe('recomposition');
  });

  it('uses transitions for historical accuracy', () => {
    const transitions: PhaseTransition[] = [
      { user_id: 'u1', from_phase: 'stabilization', to_phase: 'maintenance', day: 32, date: '2026-01-01', reason: null },
      { user_id: 'u1', from_phase: 'maintenance', to_phase: 'recomposition', day: 60, date: '2026-02-01', reason: null },
    ];

    // Day 40 was maintenance at the time
    expect(phaseFor(40, defaultProfile, transitions)).toBe('maintenance');
    // Day 65 is recomposition
    expect(phaseFor(65, defaultProfile, transitions)).toBe('recomposition');
    // Day 32 is the exact transition day — should be maintenance
    expect(phaseFor(32, defaultProfile, transitions)).toBe('maintenance');
  });
});

describe('phaseBands', () => {
  it('returns correct bands for a 35-day program', () => {
    const bands = phaseBands(35, defaultProfile);
    expect(bands).toEqual([
      { phase: 'loading', from: 1, to: 2 },
      { phase: 'activation', from: 3, to: 10 },
      { phase: 'transition', from: 11, to: 13 },
      { phase: 'stabilization', from: 14, to: 31 },
      { phase: 'maintenance', from: 32, to: 35 },
    ]);
  });
});
