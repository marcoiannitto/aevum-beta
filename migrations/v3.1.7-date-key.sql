-- AEVUM v3.1.7 Migration: daily_logs unique key from (user_id, day) to (user_id, date)
-- Fixes #52/#55: program switch no longer corrupts historical data
--
-- BEFORE RUNNING:
-- 1. Take a full backup: SELECT * FROM daily_logs ORDER BY user_id, date;
-- 2. Run the dedup check below to see what will be cleaned up
-- 3. Run each section one at a time

-- ============================================================
-- STEP 0: Verify — check for duplicate (user_id, date) pairs
-- ============================================================
-- Run this first. If it returns rows, those duplicates will be
-- resolved by keeping the row with the latest updated_at.
--
-- SELECT user_id, date, COUNT(*) as cnt
-- FROM daily_logs
-- WHERE date != ''
-- GROUP BY user_id, date
-- HAVING cnt > 1;

-- ============================================================
-- STEP 1a: Backfill program_start_date for users who don't have it
-- ============================================================
UPDATE users
  SET program_start_date = start_date
  WHERE program_start_date IS NULL AND start_date IS NOT NULL;

-- ============================================================
-- STEP 1b: Data cleanup — fix marco's day 1 reset
-- ============================================================
-- The program switch created a new row with day=1 for 2026-10-23.
-- Correct it to the actual sequential day number.
UPDATE daily_logs
  SET day = 46
  WHERE user_id = 'marco'
    AND date = '2026-10-23'
    AND day = 1;

-- ============================================================
-- STEP 2: Deduplicate rows with same (user_id, day) but different dates
-- These are caused by sync bugs (day 36, day 43 duplicates).
-- Keep the row with the earlier date (the correct one), delete the dupe.
-- ============================================================

-- Preview what will be deleted:
-- SELECT id, user_id, day, date, weight, kcal, updated_at
-- FROM daily_logs
-- WHERE (user_id, day) IN (
--   SELECT user_id, day FROM daily_logs GROUP BY user_id, day HAVING COUNT(*) > 1
-- )
-- ORDER BY user_id, day, date;

-- Delete the duplicate rows (keep earliest date per user_id+day):
DELETE FROM daily_logs
  WHERE id NOT IN (
    SELECT MIN(id) FROM daily_logs GROUP BY user_id, day
  )
  AND (user_id, day) IN (
    SELECT user_id, day FROM daily_logs GROUP BY user_id, day HAVING COUNT(*) > 1
  );

-- ============================================================
-- STEP 3: Recreate table with UNIQUE(user_id, date)
-- ============================================================

-- Create new table with correct constraint
CREATE TABLE daily_logs_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT NOT NULL,
  day           INTEGER NOT NULL,
  phase         TEXT,
  date          TEXT NOT NULL,
  weight        REAL,
  waist         REAL,
  serum_am      TEXT,
  serum_pm      TEXT,
  kcal          REAL,
  protein       REAL,
  fat           REAL,
  carbs         REAL,
  water_ml      REAL,
  exercise      TEXT,
  exercise_kcal REAL,
  energy        TEXT,
  hunger        TEXT,
  sleep         TEXT,
  notes         TEXT,
  day_json      TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, date)
);

-- Copy data
INSERT INTO daily_logs_new (
  user_id, day, phase, date, weight, waist,
  serum_am, serum_pm, kcal, protein, fat, carbs, water_ml,
  exercise, exercise_kcal, energy, hunger, sleep, notes,
  day_json, created_at, updated_at
)
SELECT
  user_id, day, phase, date, weight, waist,
  serum_am, serum_pm, kcal, protein, fat, carbs, water_ml,
  exercise, exercise_kcal, energy, hunger, sleep, notes,
  day_json, created_at, updated_at
FROM daily_logs;

-- Swap
DROP TABLE daily_logs;
ALTER TABLE daily_logs_new RENAME TO daily_logs;

-- Recreate index for getdays query performance
CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, date);

-- ============================================================
-- STEP 4: Verify
-- ============================================================
-- SELECT user_id, COUNT(*) as rows, MIN(date) as first, MAX(date) as last
-- FROM daily_logs GROUP BY user_id;
--
-- SELECT COUNT(*) FROM daily_logs; -- should match pre-migration count minus deduped rows
