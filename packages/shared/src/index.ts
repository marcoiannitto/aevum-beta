/**
 * @aevum/shared — barrel export
 */

// Constants
export {
  PH_FIXED,
  PHASE_KEYS,
  DEFAULT_ACTIVATION_DAYS,
  ALC_WORDS,
  HAIKU_MODEL,
  AI_WORKER_DEFAULT,
  RATE_LIMIT,
  RATE_WINDOW_MS,
  ME,
} from './constants.js';
export type { PhaseKey, PhaseMode } from './constants.js';

// Types
export type {
  Profile,
  DayLog,
  Rule,
  PhaseRow,
  PhaseTransition,
  ComplianceDay,
  ComplianceIssue,
  ComplianceStats,
  MealPlanRow,
  AuthToken,
  ConfigRow,
  UserConfigRow,
  MessageRow,
  IntakeToken,
  FoodRow,
  RecipeRow,
  BodyScan,
  DayJsonItem,
  DayJsonMeal,
  Order,
  OrderItem,
} from './types.js';

// Phase logic
export {
  activationDays,
  resetDayCount,
  phaseFor,
  phaseBands,
} from './phases.js';
export type { PhaseProfile, PhaseBand } from './phases.js';

// Calorie / utility functions
export { mifflinTDEE, dobToAge, num, isTruthy } from './calories.js';

// Calorie bank
export {
  computeBank,
  clampTarget,
  bankActive,
  weeklyVerdict,
  BANK_DEFAULTS,
} from './calorie-bank.js';
export type { DayRecord, BankOpts } from './calorie-bank.js';

// Compliance engine
export {
  findRule,
  bandStatus,
  isAlcohol,
  deriveCompliance,
  computeStats,
} from './compliance.js';
