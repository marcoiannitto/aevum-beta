import { describe, it, expect } from 'vitest';
import { mifflinTDEE, dobToAge, num, isTruthy } from '../src/calories.js';

describe('mifflinTDEE', () => {
  it('calculates male TDEE correctly', () => {
    // 80kg, 175cm, 35yo, male, moderate activity 1.55
    const tdee = mifflinTDEE(80, 175, 35, 'm', 1.55);
    // (10*80 + 6.25*175 - 5*35 + 5) * 1.55 = (800 + 1093.75 - 175 + 5) * 1.55 = 1723.75 * 1.55 = 2671.8125
    expect(tdee).toBe(2672);
  });

  it('calculates female TDEE correctly', () => {
    // 65kg, 163cm, 28yo, female, light activity 1.375
    const tdee = mifflinTDEE(65, 163, 28, 'f', 1.375);
    // (10*65 + 6.25*163 - 5*28 - 161) * 1.375 = (650 + 1018.75 - 140 - 161) * 1.375 = 1367.75 * 1.375 = 1880.65625
    expect(tdee).toBe(1881);
  });
});

describe('dobToAge', () => {
  it('returns correct age when birthday has passed', () => {
    const now = new Date();
    const pastBday = new Date(now.getFullYear() - 30, 0, 1); // Jan 1, 30 years ago
    const age = dobToAge(pastBday.toISOString().slice(0, 10));
    expect(age).toBe(30);
  });
});

describe('num', () => {
  it('parses valid numbers', () => {
    expect(num('42.5')).toBe(42.5);
    expect(num(0)).toBe(0);
  });

  it('returns null for non-numbers', () => {
    expect(num('abc')).toBeNull();
    expect(num(undefined)).toBeNull();
    expect(num(null)).toBeNull();
  });
});

describe('isTruthy', () => {
  it('recognizes truthy values', () => {
    expect(isTruthy(true)).toBe(true);
    expect(isTruthy(1)).toBe(true);
    expect(isTruthy('1')).toBe(true);
    expect(isTruthy('yes')).toBe(true);
    expect(isTruthy('YES')).toBe(true);
    expect(isTruthy('true')).toBe(true);
  });

  it('rejects falsy values', () => {
    expect(isTruthy(false)).toBe(false);
    expect(isTruthy(0)).toBe(false);
    expect(isTruthy('no')).toBe(false);
    expect(isTruthy(null)).toBe(false);
    expect(isTruthy(undefined)).toBe(false);
  });
});
