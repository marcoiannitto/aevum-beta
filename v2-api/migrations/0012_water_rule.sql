-- Add recomposition water rule (was in macro_rules JSON, missed in 0011)
INSERT INTO rules (phase, model, metric, basis, value, green_lo, green_hi, amber_lo, amber_hi, gated, unit)
VALUES ('recomposition', 'all', 'water', 'per_kg_target_weight', 0.04, NULL, NULL, NULL, NULL, 'yes', 'L/kg');
