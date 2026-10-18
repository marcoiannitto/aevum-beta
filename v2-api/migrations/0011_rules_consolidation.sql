-- Move all macro rules from phases.macro_rules JSON into the rules table.
-- After this, all nutritional rules live in one place (editable via admin).
-- calorie_cut stays on the phases table (it's phase config, not a rule metric).

-- ═══ MAINTENANCE ═══
-- Protein: 1.2-1.5 g/kg target weight, amber below 0.8
INSERT INTO rules (phase, model, metric, basis, value, green_lo, green_hi, amber_lo, amber_hi, gated, unit)
VALUES ('maintenance', 'all', 'protein', 'per_kg_target_weight', 1.35, 1.2, 1.5, 0.8, NULL, 'yes', 'g/kg');

-- Kcal: adaptive (target computed by frontend from TDEE x calorie_cut)
INSERT INTO rules (phase, model, metric, basis, value, green_lo, green_hi, amber_lo, amber_hi, gated, unit)
VALUES ('maintenance', 'all', 'kcal', 'adaptive_kcal', NULL, NULL, NULL, NULL, NULL, 'yes', 'kcal');

-- ═══ RECOMPOSITION ═══
-- Protein: 1.9-2.0 g/kg, amber below 1.2
INSERT INTO rules (phase, model, metric, basis, value, green_lo, green_hi, amber_lo, amber_hi, gated, unit)
VALUES ('recomposition', 'all', 'protein', 'per_kg_target_weight', 1.95, 1.9, 2.0, 1.2, NULL, 'yes', 'g/kg');

-- Fat: 0.8-1.0 g/kg, amber below 0.4, amber above 1.5
INSERT INTO rules (phase, model, metric, basis, value, green_lo, green_hi, amber_lo, amber_hi, gated, unit)
VALUES ('recomposition', 'all', 'fat', 'per_kg_target_weight', 0.9, 0.8, 1.0, 0.4, 1.5, 'yes', 'g/kg');

-- Kcal: adaptive
INSERT INTO rules (phase, model, metric, basis, value, green_lo, green_hi, amber_lo, amber_hi, gated, unit)
VALUES ('recomposition', 'all', 'kcal', 'adaptive_kcal', NULL, NULL, NULL, NULL, NULL, 'yes', 'kcal');

-- ═══ TRACKER (free users, same as maintenance) ═══
-- Protein: 1.2-1.5 g/kg target weight, amber below 0.8
INSERT INTO rules (phase, model, metric, basis, value, green_lo, green_hi, amber_lo, amber_hi, gated, unit)
VALUES ('tracker', 'all', 'protein', 'per_kg_target_weight', 1.35, 1.2, 1.5, 0.8, NULL, 'yes', 'g/kg');

-- Kcal: adaptive
INSERT INTO rules (phase, model, metric, basis, value, green_lo, green_hi, amber_lo, amber_hi, gated, unit)
VALUES ('tracker', 'all', 'kcal', 'adaptive_kcal', NULL, NULL, NULL, NULL, NULL, 'yes', 'kcal');

-- ═══ STABILIZATION (add protein rule, fat/carbs already handled by existing gated rules) ═══
-- Protein: 1.2-1.5 g/kg target weight, amber below 0.8
INSERT INTO rules (phase, model, metric, basis, value, green_lo, green_hi, amber_lo, amber_hi, gated, unit)
VALUES ('stabilization', 'all', 'protein', 'per_kg_target_weight', 1.35, 1.2, 1.5, 0.8, NULL, 'yes', 'g/kg');
