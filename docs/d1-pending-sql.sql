-- ============================================================
-- AEVUM D1 — Pending SQL changes
-- Run these against the production D1 database via Cloudflare dashboard
-- Date: 2026-10-23
-- ============================================================

-- #53: Fix activity labels in config table
-- The default labels from code are fine, but if there's a D1 override
-- row that's wrong/outdated, update it:
INSERT OR REPLACE INTO config (key, value) VALUES (
  'act_labels',
  'No exercise,1-3 days/week,3-5 days/week,6-7 days/week,Athlete / physical job + training'
);

-- #52: Backfill phase column from day_json for existing daily_logs
-- This stamps the phase into the phase column for any rows that
-- have phase in day_json but NULL in the phase column.
-- NOTE: This uses json_extract which is available in D1 (SQLite).
UPDATE daily_logs
SET phase = json_extract(day_json, '$.phase')
WHERE phase IS NULL
  AND day_json IS NOT NULL
  AND json_extract(day_json, '$.phase') IS NOT NULL;

-- Verify: count of rows that still have NULL phase after backfill
-- (these are pre-fix rows without phase in day_json — will be stamped on next sync)
-- SELECT COUNT(*) FROM daily_logs WHERE phase IS NULL;
