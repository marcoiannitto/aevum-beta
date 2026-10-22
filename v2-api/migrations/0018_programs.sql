-- #26 Program Selector: programs table, program_id FK, program_transitions history

-- ═══ Programs table ═══

CREATE TABLE IF NOT EXISTS programs (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT DEFAULT '#3E7A6A',
  sort_order  INTEGER DEFAULT 0,
  is_active   INTEGER DEFAULT 1
);

-- ═══ Seed programs ═══

INSERT OR IGNORE INTO programs (id, name, description, color, sort_order) VALUES
  ('aevum',         'AEVUM',         'The full protocol: loading, activation, transition, stabilization. Guided fat loss with serum support.', '#B08D2E', 10),
  ('maintenance',   'Maintenance',   'Hold your weight with adaptive calorie targets and a rolling calorie bank.',                             '#3E7A6A', 20),
  ('recomposition', 'Recomposition', 'Build muscle while managing body fat. Higher protein, moderate deficit.',                                '#6B4E8B', 30),
  ('keto',          'Keto',          'Very low carb, high fat. Stay in ketosis for fat adaptation.',                                           '#2A6B96', 40);

-- ═══ Add program_id to phases ═══

ALTER TABLE phases ADD COLUMN program_id TEXT DEFAULT 'aevum';

-- Backfill AEVUM phases
UPDATE phases SET program_id = 'aevum'
  WHERE key IN ('loading', 'activation', 'transition', 'stabilization');

-- Post-program phases (maintenance/tracker/recomposition) belong to no specific program
UPDATE phases SET program_id = NULL
  WHERE key IN ('maintenance', 'tracker', 'recomposition');

-- Insert single-phase entries for non-AEVUM programs
INSERT OR IGNORE INTO phases (key, name, sort_order, program_id, is_program, calorie_mode, target_mode)
VALUES
  ('maintenance_main', 'Maintenance',   10, 'maintenance',   1, 'tdee_mult', 'tdee_mult'),
  ('recomp_main',      'Recomposition', 10, 'recomposition', 1, 'tdee_mult', 'tdee_mult'),
  ('keto_main',        'Keto',          10, 'keto',          1, 'tdee_mult', 'tdee_mult');

-- ═══ Add program_id to users ═══

ALTER TABLE users ADD COLUMN program_id TEXT DEFAULT 'aevum';

-- Backfill existing users
UPDATE users SET program_id = 'aevum' WHERE program_id IS NULL;

-- ═══ Program transitions history ═══

CREATE TABLE IF NOT EXISTS program_transitions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT NOT NULL,
  from_program  TEXT,
  to_program    TEXT NOT NULL,
  from_phase    TEXT,
  to_phase      TEXT,
  switched_at   TEXT NOT NULL,
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_program_transitions_user ON program_transitions(user_id);
CREATE INDEX IF NOT EXISTS idx_program_transitions_date ON program_transitions(user_id, switched_at);
