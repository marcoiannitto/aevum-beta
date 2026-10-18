-- ONE-TIME: Register migrations 0001-0012 as already applied so wrangler
-- doesn't try to re-run them. Run this ONCE from your machine:
--   wrangler d1 execute aevum-db --remote --file=v2-api/migrations/_seed_tracking.sql
-- Then delete this file.

CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO d1_migrations (name) VALUES
  ('0001_meal_plan_builder.sql'),
  ('0002_intake_form.sql'),
  ('0003_users_intake_token.sql'),
  ('0004_body_scans.sql'),
  ('0005_scan_reference.sql'),
  ('0006_phase_lengths.sql'),
  ('0007_phase_registry.sql'),
  ('0008_fix_maintenance_rules.sql'),
  ('0009_recomposition_phase.sql'),
  ('0010_macro_rules.sql'),
  ('0011_rules_consolidation.sql'),
  ('0012_water_rule.sql');
