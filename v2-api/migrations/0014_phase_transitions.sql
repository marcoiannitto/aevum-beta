-- Phase Transitions: immutable log of phase changes per user.
-- Fixes the retroactive phase-relabeling bug: once a day is assigned a phase,
-- it stays that phase forever. Transitions are recorded, not inferred.

CREATE TABLE IF NOT EXISTS phase_transitions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL,
  from_phase TEXT NOT NULL,
  to_phase   TEXT NOT NULL,
  day        INTEGER NOT NULL,
  date       TEXT NOT NULL,
  reason     TEXT
);

CREATE INDEX IF NOT EXISTS idx_phase_transitions_user ON phase_transitions(user_id);

-- ═══ Missing indexes on existing tables ═══

-- daily_logs: composite unique (user_id, day) — may already exist from app-level logic
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_logs_user_day ON daily_logs(user_id, day);

-- meal_plans: lookup by user + day
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_day ON meal_plans(user_id, day);

-- rules: lookup by phase + metric
CREATE INDEX IF NOT EXISTS idx_rules_phase_metric ON rules(phase, metric);

-- foods: lookup by phase
CREATE INDEX IF NOT EXISTS idx_foods_phase ON foods(phase);

-- body_scans: lookup by user
CREATE INDEX IF NOT EXISTS idx_body_scans_user ON body_scans(user_id);
