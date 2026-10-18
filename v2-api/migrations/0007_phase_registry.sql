-- Phase Registry: single source of truth for all phase configuration
CREATE TABLE IF NOT EXISTS phases (
  key                TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  color              TEXT NOT NULL,
  sort_order         INTEGER NOT NULL,
  duration_default   INTEGER,          -- NULL = open-ended
  duration_col       TEXT,             -- users column for per-user override
  is_program         INTEGER DEFAULT 1,
  requires_serum     INTEGER DEFAULT 0,
  has_fasting        INTEGER DEFAULT 0,
  gate_fat           INTEGER DEFAULT 0,
  gate_carb          INTEGER DEFAULT 0,
  use_buckets        INTEGER DEFAULT 0,
  calorie_mode       TEXT DEFAULT 'bar',   -- 'bar', 'protocol', 'hidden'
  calorie_bank       INTEGER DEFAULT 0,
  inherits_rules_from TEXT,
  food_rule_line     TEXT,
  explainer_json     TEXT,
  fitness_intro      TEXT,
  show_in_phase_bar  INTEGER DEFAULT 1,
  show_in_recipe_chips INTEGER DEFAULT 1
);

-- Seed current phases
INSERT INTO phases (key, name, color, sort_order, duration_default, duration_col, is_program, requires_serum, has_fasting, gate_fat, gate_carb, use_buckets, calorie_mode, calorie_bank, inherits_rules_from, food_rule_line, explainer_json, fitness_intro, show_in_phase_bar, show_in_recipe_chips) VALUES
('loading', 'Loading', '#8a8a8a', 10, 2, 'loading_days', 1, 1, 0, 0, 0, 0, 'hidden', 0, NULL,
 'Loading: eat freely to your target. Avoid only sweets, sugary drinks and alcohol.',
 '{"sub":"The ramp-in","change":"Eat freely to a high target. This sets your body up. It is not the diet yet.","eat":"Almost all whole foods: protein, veg, fruit, grains, rice, potato, dairy.","avoid":"Added-sugar sweets and desserts, sugary drinks and juice, alcohol.","targets":["Eat to a high calorie target","No fasting window"],"expect":"Enjoy these two days. You are setting up, not restricting yet."}',
 'Ease into movement. Gentle and short.', 1, 1),

('activation', 'Activation', '#B08D2E', 20, NULL, NULL, 1, 1, 1, 1, 1, 1, 'protocol', 0, NULL,
 'Grilled protein + vegetables. No rice, bread, noodles or potato. No oil, no sauce.',
 '{"sub":"The core reset","change":"Very low calorie and protein-sparing. Your body burns through its quick sugar (glucose) and switches to running on your stored body fat (ketosis). That switch is the whole point.","eat":"Lean protein, low-carb veg, low-sugar fruit.","avoid":"Oil, fat, grains, starch, dairy and sugary foods.","targets":["{VLCD} kcal a day","16/8 fasting (8-hour eating window)","Water 2.5 L","Serum morning and evening"],"expect":"Days 2 to 4 can feel flat or foggy while your body changes fuel. It passes: energy steadies and hunger fades. That is the switch working."}',
 'A little movement today. Pick something and follow along, no rush.', 1, 1),

('transition', 'Transition', '#B08D2E', 30, 3, 'transition_days', 1, 0, 1, 1, 1, 1, 'protocol', 0, 'activation',
 'Grilled protein + vegetables. No rice, bread, noodles or potato. No oil, no sauce.',
 '{"sub":"Easing out","change":"The serum stops here. These days settle your body at its new, lower weight before food widens. The rules stay the same as Activation.","eat":"Same as Activation: lean protein and low-carb veg.","avoid":"Same as Activation: no oil, fat, grains, starch, dairy or sugar.","targets":["{VLCD} kcal a day","16/8 fasting","Water 2.5 L","No serum"],"expect":"You are easing out, letting your body get comfortable where it is now. Nearly through the strict block."}',
 'A little movement today. Pick something and follow along, no rush.', 1, 1),

('stabilization', 'Stabilization', '#4a463f', 40, 18, 'stabilization_days', 1, 0, 0, 0, 1, 0, 'bar', 0, NULL,
 'Stabilization: protein + fat + low-carb veg. Berries only. No sugar, starch, grains or added-sugar foods.',
 '{"sub":"Locking the new set-point","change":"More food, fats come back, calories climb back up. But this is not a finish line.","eat":"All protein, low-carb veg, healthy fats, full-fat dairy, berries.","avoid":"Sugar, grains, starch and most fruit.","targets":["Calories ramp up over 4 days to about 90% of maintenance, then hold","Carbs under 40 g a day, from veg","Protein 1.2 to 1.5 g per kg","Weight held within 500 g"],"expect":"You can eat more, but you are not out of the woods. Keep sugar and carbs out or the weight rebounds fast. Hold the line and the new set-point locks in. Energy returns and weight settles."}',
 'Pick a routine and follow along at your own pace.', 1, 1),

('maintenance', 'Maintenance', '#3E7A6A', 50, NULL, NULL, 1, 0, 0, 0, 1, 0, 'bar', 1, 'stabilization',
 'Maintenance: balanced meals, protein first. Keep carbs moderate. Track calories to stay on target.',
 '{"sub":"Your new normal","change":"The program is done. Now you keep going on your own with the tracker, adaptive calories and the AI meal analyser.","eat":"Balanced meals: protein first, healthy fats, moderate carbs. Same principles, more freedom.","avoid":"Excess sugar, ultra-processed food, large calorie spikes.","targets":["Adaptive calorie target (TDEE x 0.90)","Protein 1.2 g per kg","Carbs moderate, from whole foods","Calorie bank: 4-day rolling balance"],"expect":"Weight may fluctuate day to day. Focus on the trend. The calorie bank gives you flexibility across days."}',
 'Keep moving. Pick a routine that fits your day.', 1, 1),

('tracker', 'Tracking', '#3E7A6A', 60, NULL, NULL, 0, 0, 0, 0, 1, 0, 'bar', 1, 'maintenance',
 'Track your meals and stay on target.',
 '{"sub":"Your daily tracker","change":"Track calories, macros and weight to stay on course.","eat":"Balanced meals: protein first, healthy fats, moderate carbs.","avoid":"Excess sugar, ultra-processed food.","targets":["Calorie target based on your TDEE","Protein 1.2 g per kg"],"expect":"Consistency is the goal. Track daily and watch the trend."}',
 'Keep moving. Pick a routine that fits your day.', 0, 0);

-- phase_mode on users: distinguishes post-program paths (maintenance vs recomposition vs future modes)
ALTER TABLE users ADD COLUMN phase_mode TEXT;
