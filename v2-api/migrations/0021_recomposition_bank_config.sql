-- v.1.0.0 2026-10-29 — Fix: update recomposition bank config to match maintenance (missed in 0020)

-- Recomposition was left with stale bank config from 0013 (window=4, clamp 0.85/1.15).
-- Should match maintenance: window=7, clamp 0.60/1.30 per calorie-bank spec.
UPDATE phases SET
  bank_window = 7,
  bank_clamp_lo = 0.60,
  bank_clamp_hi = 1.30
WHERE key = 'recomposition';
