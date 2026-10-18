/**
 * AEVUM shared types — derived from D1 schema + index.js usage.
 */

import type { PhaseKey, PhaseMode } from './constants.js';

// ─── User / Profile ──────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  sex: 'm' | 'f';
  dob: string | null;
  age: number;
  height: number;
  start_weight: number;
  activity: number;
  target_kg: number | null;
  current_target_kcal: number | null;
  prev_target_kcal: number | null;
  last_review_date: string | null;
  last_change_reason: string | null;
  maintenance_mode: string | null;
  maintenance_diet: string | null;
  phase_mode: PhaseMode | null;
  program: string | null;
  notes: string | null;
  email: string | null;
  start_date: string | null;
  activation_days: number | null;
  stab_target_weight: number | null;
  maint_target_weight: number | null;
  activation_model: string | null;
  loading_days: number | null;
  transition_days: number | null;
  stabilization_days: number | null;
  intake_token: string | null;
  created_at: string | null;
}

// ─── Daily Log ───────────────────────────────────────────────

export interface DayLog {
  user_id: string;
  day: number;
  phase: string;
  date: string;
  weight: number | null;
  waist: number | null;
  serum_am: string | null;
  serum_pm: string | null;
  kcal: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  water_ml: number | null;
  exercise: string | null;
  exercise_kcal: number | null;
  energy: number | null;
  hunger: number | null;
  sleep: number | null;
  notes: string | null;
  day_json: string | null;
  updated_at: string | null;
}

// ─── Rules ───────────────────────────────────────────────────

export interface Rule {
  phase: string;
  model: string;
  metric: string;
  basis: string;
  value: number | null;
  green_lo: number | null;
  green_hi: number | null;
  amber_lo: number | null;
  amber_hi: number | null;
  gated: string;
  unit: string;
}

// ─── Phases ──────────────────────────────────────────────────

export interface PhaseRow {
  name: PhaseKey;
  label: string;
  sort_order: number;
  calorie_mode: string;
  calorie_cut: number | null;
  macro_rules: string | null;
  inherits_rules_from: string | null;
  target_mode: string | null;
  target_fixed_lo: number | null;
  target_fixed_hi: number | null;
  ramp_from: string | null;
  ramp_days: number | null;
  ramp_pct: number | null;
  bank_window: number | null;
  bank_clamp_lo: number | null;
  bank_clamp_hi: number | null;
  drift_enabled: number | null;
  drift_review_days: number | null;
  drift_step_kcal: number | null;
  drift_floor_kcal: number | null;
  drift_band_kg: number | null;
}

// ─── Phase Transition (new — fixes the "retroactive phase" bug) ──

export interface PhaseTransition {
  id?: number;
  user_id: string;
  from_phase: PhaseKey;
  to_phase: PhaseKey;
  day: number;
  date: string;
  reason: string | null;
}

// ─── Compliance ──────────────────────────────────────────────

export type Severity = 'red' | 'amber' | 'info';
export type ComplianceStatus = 'green' | 'amber' | 'red' | 'empty';

export interface ComplianceIssue {
  type: string;
  sev: Severity;
  detail: string;
}

export interface ComplianceDay {
  day: number;
  date: string;
  phase: string;
  status: ComplianceStatus;
  issues: ComplianceIssue[];
}

export interface ComplianceStats {
  startWeight: number | null;
  endWeight: number | null;
  peakWeight: number | null;
  delta: number | null;
  totalDays: number;
  scoredDays: number;
  redFreeDays: number;
  compliancePct: number;
  exerciseDays: number;
  avgKcal: number;
}

// ─── Meal Plan ───────────────────────────────────────────────

export interface MealPlanRow {
  user_id: string;
  day: number;
  meal: string;
  recipe: string | null;
  kcal: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  meal_type: string | null;
  meal_slot: string | null;
  components_json: string | null;
}

// ─── Auth ────────────────────────────────────────────────────

export interface AuthToken {
  token: string;
  user_id: string;
  role: string;
  expires_at: string | null;
}

// ─── Config / Messages ───────────────────────────────────────

export interface ConfigRow {
  key: string;
  value: string;
}

export interface MessageRow {
  id: number;
  trigger: string;
  enabled: number;
  phase: string;
  priority: number;
  title: string;
  body: string;
  badge: string | null;
  frequency: string | null;
}

// ─── Intake ──────────────────────────────────────────────────

export interface IntakeToken {
  token: string;
  user_id: string | null;
  status: string;
  data_json: string | null;
  created_at: string;
  updated_at: string | null;
}

// ─── Food ────────────────────────────────────────────────────

export interface FoodRow {
  phase: string;
  category: string;
  subcategory: string | null;
  item: string;
  verdict: string;
  cap_g: number | null;
  note: string | null;
}

// ─── Recipe ──────────────────────────────────────────────────

export interface RecipeRow {
  name: string;
  protein: string | null;
  cuisine: string | null;
  phase: string | null;
  kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  ingredients: string | null;
  steps: string | null;
}

// ─── Body Scan ───────────────────────────────────────────────

export interface BodyScan {
  id?: number;
  user_id: string;
  scan_date: string;
  weight: number | null;
  body_fat_pct: number | null;
  muscle_mass: number | null;
  visceral_fat: number | null;
  bmr: number | null;
  notes: string | null;
  reference_json: string | null;
}

// ─── Day JSON item ───────────────────────────────────────────

export interface DayJsonItem {
  name?: string;
  note?: string;
  category?: string;
  verdict?: string;
  kcal?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
}

export interface DayJsonMeal {
  label?: string;
  items?: DayJsonItem[];
}
