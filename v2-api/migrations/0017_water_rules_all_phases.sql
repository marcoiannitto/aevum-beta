-- Seed flat 2.5L water rules for all phases that don't have one yet.
-- Recomposition already has 0.04 L/kg from migration 0012.
-- basis='fixed' means the value is absolute (not multiplied by weight).

INSERT OR IGNORE INTO rules (phase, model, metric, basis, value, green_lo, green_hi, amber_lo, amber_hi, gated, unit)
VALUES ('maintenance', 'all', 'water', 'fixed', 2.5, NULL, NULL, NULL, NULL, 'no', 'L');

INSERT OR IGNORE INTO rules (phase, model, metric, basis, value, green_lo, green_hi, amber_lo, amber_hi, gated, unit)
VALUES ('stabilization', 'all', 'water', 'fixed', 2.5, NULL, NULL, NULL, NULL, 'no', 'L');

INSERT OR IGNORE INTO rules (phase, model, metric, basis, value, green_lo, green_hi, amber_lo, amber_hi, gated, unit)
VALUES ('tracker', 'all', 'water', 'fixed', 2.5, NULL, NULL, NULL, NULL, 'no', 'L');

INSERT OR IGNORE INTO rules (phase, model, metric, basis, value, green_lo, green_hi, amber_lo, amber_hi, gated, unit)
VALUES ('activation', 'all', 'water', 'fixed', 2.5, NULL, NULL, NULL, NULL, 'no', 'L');

INSERT OR IGNORE INTO rules (phase, model, metric, basis, value, green_lo, green_hi, amber_lo, amber_hi, gated, unit)
VALUES ('transition', 'all', 'water', 'fixed', 2.5, NULL, NULL, NULL, NULL, 'no', 'L');

INSERT OR IGNORE INTO rules (phase, model, metric, basis, value, green_lo, green_hi, amber_lo, amber_hi, gated, unit)
VALUES ('loading', 'all', 'water', 'fixed', 2.5, NULL, NULL, NULL, NULL, 'no', 'L');
