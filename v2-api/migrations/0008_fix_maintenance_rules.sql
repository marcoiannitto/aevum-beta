-- Maintenance should NOT inherit rules from stabilization.
-- It has its own, more liberal food rules (no carb cap).
UPDATE phases SET inherits_rules_from = NULL WHERE key = 'maintenance';

-- Tracker also should not inherit from maintenance for the same reason:
-- it uses its own rule set via the AI.
UPDATE phases SET inherits_rules_from = NULL WHERE key = 'tracker';
