/**
 * Drizzle ORM schema for AEVUM D1 database.
 * Mirrors the existing D1 schema from migrations 0001–0012.
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ─── Users ───────────────────────────────────────────────────

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sex: text('sex').notNull(), // 'm' | 'f'
  dob: text('dob'),
  age: integer('age').notNull(),
  height: real('height').notNull(),
  start_weight: real('start_weight').notNull(),
  activity: real('activity').notNull().default(1.55),
  target_kg: real('target_kg'),
  current_target_kcal: integer('current_target_kcal'),
  prev_target_kcal: integer('prev_target_kcal'),
  last_review_date: text('last_review_date'),
  last_change_reason: text('last_change_reason'),
  maintenance_mode: text('maintenance_mode'),
  maintenance_diet: text('maintenance_diet'),
  phase_mode: text('phase_mode'),
  program: text('program'),
  notes: text('notes'),
  email: text('email'),
  start_date: text('start_date'),
  activation_days: integer('activation_days'),
  stab_target_weight: real('stab_target_weight'),
  maint_target_weight: real('maint_target_weight'),
  activation_model: text('activation_model'),
  loading_days: integer('loading_days'),
  transition_days: integer('transition_days'),
  stabilization_days: integer('stabilization_days'),
  intake_token: text('intake_token'),
  created_at: text('created_at'),
});

// ─── Auth Tokens ─────────────────────────────────────────────

export const authTokens = sqliteTable('auth_tokens', {
  token: text('token').primaryKey(),
  user_id: text('user_id').notNull(),
  role: text('role').notNull().default('user'),
  expires_at: text('expires_at'),
});

// ─── Daily Logs ──────────────────────────────────────────────

export const dailyLogs = sqliteTable('daily_logs', {
  user_id: text('user_id').notNull(),
  day: integer('day').notNull(),
  phase: text('phase'),
  date: text('date'),
  weight: real('weight'),
  waist: real('waist'),
  serum_am: text('serum_am'),
  serum_pm: text('serum_pm'),
  kcal: real('kcal'),
  protein: real('protein'),
  fat: real('fat'),
  carbs: real('carbs'),
  water_ml: real('water_ml'),
  exercise: text('exercise'),
  exercise_kcal: real('exercise_kcal'),
  energy: integer('energy'),
  hunger: integer('hunger'),
  sleep: integer('sleep'),
  notes: text('notes'),
  day_json: text('day_json'),
  updated_at: text('updated_at'),
});

// ─── Meal Plans ──────────────────────────────────────────────

export const mealPlans = sqliteTable('meal_plans', {
  user_id: text('user_id').notNull(),
  day: integer('day').notNull(),
  meal: text('meal').notNull(),
  recipe: text('recipe'),
  kcal: real('kcal'),
  protein: real('protein'),
  fat: real('fat'),
  carbs: real('carbs'),
  meal_type: text('meal_type'),
  meal_slot: text('meal_slot'),
  components_json: text('components_json'),
});

// ─── Rules ───────────────────────────────────────────────────

export const rules = sqliteTable('rules', {
  phase: text('phase').notNull(),
  model: text('model').notNull(),
  metric: text('metric').notNull(),
  basis: text('basis'),
  value: real('value'),
  green_lo: real('green_lo'),
  green_hi: real('green_hi'),
  amber_lo: real('amber_lo'),
  amber_hi: real('amber_hi'),
  gated: text('gated'),
  unit: text('unit'),
});

// ─── Phases ──────────────────────────────────────────────────

export const phases = sqliteTable('phases', {
  key: text('key').primaryKey(),
  name: text('name'),
  sort_order: integer('sort_order'),
  calorie_mode: text('calorie_mode'),
  calorie_cut: real('calorie_cut'),
  macro_rules: text('macro_rules'),
  inherits_rules_from: text('inherits_rules_from'),
  target_mode: text('target_mode'),
  target_fixed_lo: real('target_fixed_lo'),
  target_fixed_hi: real('target_fixed_hi'),
  ramp_from: text('ramp_from'),
  ramp_days: integer('ramp_days'),
  ramp_pct: real('ramp_pct'),
  bank_window: integer('bank_window'),
  bank_clamp_lo: real('bank_clamp_lo'),
  bank_clamp_hi: real('bank_clamp_hi'),
  drift_enabled: integer('drift_enabled'),
  drift_review_days: integer('drift_review_days'),
  drift_step_kcal: integer('drift_step_kcal'),
  drift_floor_kcal: integer('drift_floor_kcal'),
  drift_band_kg: real('drift_band_kg'),
});

// ─── Phase Transitions (NEW — fixes retroactive phase bug) ──

export const phaseTransitions = sqliteTable('phase_transitions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: text('user_id').notNull(),
  from_phase: text('from_phase').notNull(),
  to_phase: text('to_phase').notNull(),
  day: integer('day').notNull(),
  date: text('date').notNull(),
  reason: text('reason'),
});

// ─── Config ──────────────────────────────────────────────────

export const config = sqliteTable('config', {
  key: text('key').primaryKey(),
  value: text('value'),
});

// ─── Messages ────────────────────────────────────────────────

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  trigger: text('trigger'),
  enabled: integer('enabled').default(1),
  phase: text('phase'),
  priority: integer('priority'),
  title: text('title'),
  body: text('body'),
  badge: text('badge'),
  frequency: text('frequency'),
});

// ─── Recipes ─────────────────────────────────────────────────

export const recipes = sqliteTable('recipes', {
  name: text('name').primaryKey(),
  protein: text('protein'),
  cuisine: text('cuisine'),
  phase: text('phase'),
  kcal: real('kcal'),
  protein_g: real('protein_g'),
  fat_g: real('fat_g'),
  carbs_g: real('carbs_g'),
  ingredients: text('ingredients'),
  steps: text('steps'),
});

// ─── Foods ───────────────────────────────────────────────────

export const foods = sqliteTable('foods', {
  phase: text('phase').notNull(),
  category: text('category').notNull(),
  subcategory: text('subcategory'),
  item: text('item').notNull(),
  verdict: text('verdict'),
  cap_g: real('cap_g'),
  note: text('note'),
});

// ─── Policy ──────────────────────────────────────────────────

export const policy = sqliteTable('policy', {
  phase: text('phase').primaryKey(),
  rules_text: text('rules_text'),
});

// ─── Ingredients ─────────────────────────────────────────────

export const ingredients = sqliteTable('ingredients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category'),
  kcal_100g: real('kcal_100g'),
  protein_100g: real('protein_100g'),
  fat_100g: real('fat_100g'),
  carbs_100g: real('carbs_100g'),
});

// ─── Catered Menu ────────────────────────────────────────────

export const cateredMenu = sqliteTable('catered_menu', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category'),
  meal_type: text('meal_type'),
  kcal: real('kcal'),
  protein_g: real('protein_g'),
  fat_g: real('fat_g'),
  carbs_g: real('carbs_g'),
});

// ─── Intake Tokens ───────────────────────────────────────────

export const intakeTokens = sqliteTable('intake_tokens', {
  token: text('token').primaryKey(),
  client_name: text('client_name'),
  client_email: text('client_email'),
  prefill_json: text('prefill_json'),
  response_json: text('response_json'),
  current_step: integer('current_step').default(0),
  status: text('status').default('sent'),
  expires_at: text('expires_at'),
  submitted_at: text('submitted_at'),
  created_at: text('created_at'),
});

// ─── Body Scans ──────────────────────────────────────────────

export const bodyScans = sqliteTable('body_scans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: text('user_id').notNull(),
  scan_date: text('scan_date'),
  scan_type: text('scan_type'),         // e.g. 'InBody'
  scan_height: real('scan_height'),
  scan_weight: real('scan_weight'),
  scan_bmi: real('scan_bmi'),
  body_fat_pct: real('body_fat_pct'),
  fat_mass: real('fat_mass'),
  smm: real('smm'),                     // skeletal muscle mass
  tbw: real('tbw'),                     // total body water
  scan_bmr: real('scan_bmr'),
  visceral_fat: real('visceral_fat'),
  body_score: real('body_score'),
  reference_json: text('reference_json'),
});

// ─── Movements / Workouts ────────────────────────────────────

export const movements = sqliteTable('movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name'),
  category: text('category'),
});

export const workouts = sqliteTable('workouts', {
  workout_id: text('workout_id').primaryKey(),
  sort_order: integer('sort_order'),
  name: text('name'),
  description: text('description'),
});
