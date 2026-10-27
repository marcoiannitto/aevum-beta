-- v.1.0.0 2026-10-24 — #37c calorie bank: add grace, tolerance, weight goal columns

-- Bank grace period: calendar days from program start with no bank adjustment
ALTER TABLE phases ADD COLUMN bank_grace_days INTEGER DEFAULT 3;

-- Weekly verdict tolerance: +/- fraction for on-target (0.10 = 10%)
ALTER TABLE phases ADD COLUMN weekly_tolerance REAL DEFAULT 0.10;

-- Weight goal for drift detection (deferred #37d)
ALTER TABLE phases ADD COLUMN weight_goal TEXT;          -- 'maintain' | 'lose' | 'gain' | NULL
ALTER TABLE phases ADD COLUMN weight_goal_rate REAL;     -- target rate in kg/week

-- Update bank config for maintenance: widen window from 4 to 7, update clamps per spec
UPDATE phases SET
  bank_window = 7,
  bank_clamp_lo = 0.60,
  bank_clamp_hi = 1.30
WHERE key = 'maintenance';

-- Update bank config for tracker (mirrors maintenance)
UPDATE phases SET
  bank_window = 7,
  bank_clamp_lo = 0.60,
  bank_clamp_hi = 1.30
WHERE key = 'tracker';
