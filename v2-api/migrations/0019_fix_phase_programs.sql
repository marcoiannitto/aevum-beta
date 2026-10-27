-- Fix #26: assign existing phases to their programs, remove empty duplicates

-- Assign program_id to existing phases that already have real data
UPDATE phases SET program_id = 'maintenance'   WHERE key = 'maintenance';
UPDATE phases SET program_id = 'recomposition' WHERE key = 'recomposition';

-- Delete the empty _main duplicates (they have no real targets set)
DELETE FROM phases WHERE key = 'maintenance_main';
DELETE FROM phases WHERE key = 'recomp_main';

-- Keto has no pre-existing phase, so keto_main stays as-is
