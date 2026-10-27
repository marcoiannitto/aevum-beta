-- Calorie Rules Engine: move all hardcoded calorie target logic into the phase registry.
-- Each phase now declares HOW its calorie target is computed, plus calorie-bank and
-- weight-drift parameters. The frontend reads these and runs one generic function.

-- ═══ NEW COLUMNS ═══

-- target_mode: how the daily kcal target is determined
--   'none'           → no target shown (loading: eat high)
--   'fixed'          → fixed green band [target_fixed_lo, target_fixed_hi]
--   'tdee_mult'      → TDEE × calorie_cut, adaptive review
--   'ramp_then_hold' → ramp from ramp_from to TDEE × calorie_cut over ramp_days, then adaptive hold
ALTER TABLE phases ADD COLUMN target_mode TEXT DEFAULT 'none';

-- calorie_cut already exists from migration 0010 — do NOT re-add it

-- For fixed mode: the green-band edges
ALTER TABLE phases ADD COLUMN target_fixed_lo REAL;
ALTER TABLE phases ADD COLUMN target_fixed_hi REAL;

-- For ramp_then_hold: starting kcal and ramp shape
ALTER TABLE phases ADD COLUMN ramp_from REAL;
ALTER TABLE phases ADD COLUMN ramp_days INTEGER;
ALTER TABLE phases ADD COLUMN ramp_pct TEXT;   -- JSON array e.g. [0, 0.35, 0.60, 0.80, 1.0]

-- Calorie bank: rolling window smoothing (NULL = no bank)
ALTER TABLE phases ADD COLUMN bank_window INTEGER;
ALTER TABLE phases ADD COLUMN bank_clamp_lo REAL;
ALTER TABLE phases ADD COLUMN bank_clamp_hi REAL;

-- Weight drift: adaptive review parameters (drift_enabled=0 means no review)
ALTER TABLE phases ADD COLUMN drift_enabled INTEGER DEFAULT 0;
ALTER TABLE phases ADD COLUMN drift_review_days INTEGER;
ALTER TABLE phases ADD COLUMN drift_step_kcal REAL;
ALTER TABLE phases ADD COLUMN drift_floor_kcal REAL;
ALTER TABLE phases ADD COLUMN drift_band_kg REAL;

-- ═══ SEED EXISTING PHASES ═══

-- Loading: no target (eat high)
UPDATE phases SET target_mode = 'none'
WHERE key = 'loading';

-- Activation: fixed band 400-650
UPDATE phases SET
  target_mode = 'fixed',
  target_fixed_lo = 400,
  target_fixed_hi = 650
WHERE key = 'activation';

-- Transition: fixed band 400-650 (same as activation)
UPDATE phases SET
  target_mode = 'fixed',
  target_fixed_lo = 400,
  target_fixed_hi = 650
WHERE key = 'transition';

-- Stabilization: 4-day ramp from 600 → TDEE×0.90, then adaptive hold
UPDATE phases SET
  target_mode = 'ramp_then_hold',
  calorie_cut = 0.90,
  ramp_from = 600,
  ramp_days = 4,
  ramp_pct = '[0, 0.35, 0.60, 0.80, 1.0]',
  drift_enabled = 1,
  drift_review_days = 7,
  drift_step_kcal = 150,
  drift_floor_kcal = 1200,
  drift_band_kg = 0.5
WHERE key = 'stabilization';

-- Maintenance: TDEE × 0.90, calorie bank, adaptive review
UPDATE phases SET
  target_mode = 'tdee_mult',
  calorie_cut = 0.90,
  bank_window = 4,
  bank_clamp_lo = 0.85,
  bank_clamp_hi = 1.15,
  drift_enabled = 1,
  drift_review_days = 7,
  drift_step_kcal = 150,
  drift_floor_kcal = 1200,
  drift_band_kg = 0.5
WHERE key = 'maintenance';

-- Tracker (free tier): full TDEE, no bank, no drift
UPDATE phases SET
  target_mode = 'tdee_mult',
  calorie_cut = 1.00,
  bank_window = 0,
  drift_enabled = 0
WHERE key = 'tracker';

-- Recomposition: same as maintenance
UPDATE phases SET
  target_mode = 'tdee_mult',
  calorie_cut = 0.90,
  bank_window = 4,
  bank_clamp_lo = 0.85,
  bank_clamp_hi = 1.15,
  drift_enabled = 1,
  drift_review_days = 7,
  drift_step_kcal = 150,
  drift_floor_kcal = 1200,
  drift_band_kg = 0.5
WHERE key = 'recomposition';
