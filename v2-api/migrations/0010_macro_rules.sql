-- Add per-phase calorie multiplier and macro rules (JSON) to phase registry
ALTER TABLE phases ADD COLUMN calorie_cut REAL;
ALTER TABLE phases ADD COLUMN macro_rules TEXT;

-- Maintenance: TDEE x 0.95, protein 1.2-1.5 g/kg
UPDATE phases SET calorie_cut = 0.95, macro_rules = '{"protein":{"unit":"g_per_kg","min":1.2,"max":1.5,"amber_low":1.0,"red_low":0.8},"fat":{"unit":"free"},"carbs":{"unit":"free"},"water":{"unit":"free"}}' WHERE key = 'maintenance';

-- Recomposition: TDEE x 0.90, protein 1.9-2.0, fat 0.8-1.0 g/kg, water 0.04 l/kg
UPDATE phases SET calorie_cut = 0.90, macro_rules = '{"protein":{"unit":"g_per_kg","min":1.9,"max":2.0,"amber_low":1.6,"red_low":1.2},"fat":{"unit":"g_per_kg","min":0.8,"max":1.0,"amber_low":0.6,"red_low":0.4,"amber_high":1.2,"red_high":1.5},"carbs":{"unit":"free"},"water":{"unit":"l_per_kg","target":0.04}}' WHERE key = 'recomposition';

-- Tracker (free users): same as maintenance
UPDATE phases SET calorie_cut = 0.95, macro_rules = '{"protein":{"unit":"g_per_kg","min":1.2,"max":1.5,"amber_low":1.0,"red_low":0.8},"fat":{"unit":"free"},"carbs":{"unit":"free"},"water":{"unit":"free"}}' WHERE key = 'tracker';

-- Stabilization: protein 1.2-1.5, fat gated, carbs gated (existing rules table handles gates, this adds protein range)
UPDATE phases SET macro_rules = '{"protein":{"unit":"g_per_kg","min":1.2,"max":1.5,"amber_low":1.0,"red_low":0.8},"fat":{"unit":"gated"},"carbs":{"unit":"gated"},"water":{"unit":"free"}}' WHERE key = 'stabilization';
