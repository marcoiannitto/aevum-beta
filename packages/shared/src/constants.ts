/**
 * AEVUM shared constants — single source of truth.
 * Extracted from v2-api/src/index.js.
 */

/** Fixed-length phases (in days) */
export const PH_FIXED = {
  loading: 2,
  transition: 3,
  stabilization: 18,
} as const;

/** All known phase keys in program order */
export const PHASE_KEYS = [
  'loading',
  'activation',
  'transition',
  'stabilization',
  'maintenance',
  'tracker',
  'recomposition',
  'keto',
  'weight_loss',
] as const;

export type PhaseKey = (typeof PHASE_KEYS)[number];

/** Phase mode — drives post-stabilization routing */
export type PhaseMode = 'maintenance' | 'recomposition' | 'tracker' | 'keto' | 'weight_loss';

/** Default activation duration when profile doesn't specify */
export const DEFAULT_ACTIVATION_DAYS = 8;

/** Alcohol detection word list */
export const ALC_WORDS = [
  'alcohol', 'beer', 'wine', 'gin', 'vodka', 'whiskey', 'whisky', 'rum',
  'tequila', 'sake', 'soju', 'stout', 'ale', 'lager', 'cocktail',
  'champagne', 'prosecco', 'brandy', 'cognac', 'bourbon', 'scotch',
  'cider', 'mead', 'grappa', 'limoncello', 'amaretto', 'aperol', 'spritz',
  'negroni',
] as const;

/** AI model constants */
export const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
export const AI_WORKER_DEFAULT = 'https://sweet-fire-a436.marco-iannitto.workers.dev/';

/** Rate limiting defaults */
export const RATE_LIMIT = 60;
export const RATE_WINDOW_MS = 60_000;

/** Meal engine constants */
export const ME = {
  IBW_MEN: (h: number) => 50 + 0.9 * (h - 152),
  IBW_WOMEN: (h: number) => 45.5 + 0.9 * (h - 152),
  P_PER_KG: 1.5,
  C_DAILY: 50,
  C_LOW_BW: 30,
  C_BW_THRESHOLD: 60,
  F_DAILY: 0,
  SUPPLEMENT: { name: 'AEVUM_ITALY', protein_g: 28, kcal: 112, fat_g: 0, carbs_g: 0 },
  EATING_WINDOW_H: 8,
  FASTING_H: 16,
  SLOTS: ['Meal 1', 'Meal 2', 'Snack 1', 'Snack 2', 'Fruit'] as const,
  MAIN_MEAL_SLOTS: ['Meal 1', 'Meal 2'] as const,
  SNACK_SLOTS: ['Snack 1', 'Snack 2'] as const,
  FRUIT_SLOTS: ['Fruit'] as const,
  VEG_MIN_G: 100,
  VEG_MAX_G: 200,
  FRUIT_CAP_G: 100,
  PROTEINS: {
    allowed: ['chicken breast', 'turkey breast', 'cod', 'sea bass', 'sea bream', 'sole', 'hake', 'prawns', 'shrimp', 'squid', 'octopus', 'cuttlefish', 'clams', 'mussels', 'egg whites', 'tofu', 'veal (lean)', 'rabbit', 'horse meat', 'bresaola'],
    limited: ['turkey thigh', 'swordfish', 'tuna (fresh)', 'tempeh', 'fesa di tacchino', 'prosciutto crudo (no fat)', 'prosciutto cotto (no fat)'],
    not_allowed: ['salmon', 'mackerel', 'sardines', 'pork', 'bacon', 'sausage', 'ham', 'whole eggs', 'cheese', 'any cured/processed meat with fat'],
  },
  VEGETABLES: {
    allowed: ['zucchini', 'spinach', 'lettuce', 'rocket/arugula', 'kale', 'chard', 'broccoli', 'cauliflower', 'asparagus', 'green beans', 'cucumber', 'celery', 'fennel', 'mushrooms', 'bell peppers', 'tomatoes', 'radish', 'eggplant', 'artichoke', 'chicory', 'radicchio', 'cabbage', 'brussels sprouts', 'endive'],
    limited: ['onion', 'carrot', 'beetroot', 'pumpkin'],
    not_allowed: ['potato', 'sweet potato', 'corn', 'peas', 'beans', 'lentils', 'chickpeas', 'any dried/dehydrated vegetable'],
  },
  FRUIT: {
    allowed: ['apple', 'orange', 'grapefruit', 'strawberries', 'blueberries', 'raspberries', 'blackberries', 'lemon', 'lime', 'peach', 'plum'],
    not_allowed: ['banana', 'grape', 'mango', 'pineapple', 'cherry', 'lychee', 'persimmon', 'watermelon', 'melon', 'dried fruit', 'fruit juice'],
  },
  COOKING_METHODS: {
    allowed: ['grilled', 'boiled', 'steamed', 'baked', 'poached', 'raw', 'air-fried (no oil)', 'microwave'],
    not_allowed: ['fried', 'deep-fried', 'sauteed in oil', 'breaded', 'battered', 'pan-fried with fat'],
  },
  SEASONINGS: {
    allowed: ['salt', 'pepper', 'herbs (fresh/dried)', 'spices', 'lemon juice', 'lime juice', 'vinegar', 'garlic', 'chilli', 'mustard (no sugar)', 'soy sauce (small amount)'],
    not_allowed: ['oil', 'butter', 'mayo', 'cream', 'sugar', 'honey', 'ketchup', 'BBQ sauce', 'any sauce with fat or sugar'],
  },
  SNACK_ITEMS: {
    allowed: ['fat-free greek yogurt', 'dark chocolate (>85%)', 'bresaola', 'prosciutto crudo (no fat)', 'prosciutto cotto (no fat)', 'fesa di tacchino'],
    rules: 'Cured meat snacks limited to 1-2 times per week for health.',
  },
  PLAN_DAYS: 5,
  ACTIVATION_DEFAULT_DAYS: 8,
} as const;
