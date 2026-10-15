-- Migration: Meal Plan Builder tables
-- Adds ingredients, catered_menu tables and extends meal_plans

-- Ingredients table (migrated from ingredients.json)
CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  per_100g_kcal REAL DEFAULT 0,
  per_100g_p REAL DEFAULT 0,
  per_100g_f REAL DEFAULT 0,
  per_100g_c REAL DEFAULT 0,
  source TEXT DEFAULT 'manual'
);

-- Catered menu options (food provider combos)
CREATE TABLE IF NOT EXISTS catered_menu (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  per_serving_kcal REAL DEFAULT 0,
  per_serving_p REAL DEFAULT 0,
  per_serving_f REAL DEFAULT 0,
  per_serving_c REAL DEFAULT 0,
  serving_g REAL DEFAULT 0
);

-- Extend meal_plans: add meal_type, meal_slot, components_json
-- D1 supports ALTER TABLE ADD COLUMN
ALTER TABLE meal_plans ADD COLUMN meal_type TEXT DEFAULT 'recipe';
ALTER TABLE meal_plans ADD COLUMN meal_slot TEXT DEFAULT '';
ALTER TABLE meal_plans ADD COLUMN components_json TEXT DEFAULT '';
