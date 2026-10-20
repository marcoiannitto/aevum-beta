# AEVUM Domain Logic

> Single source of truth for phase model, rules engine, calorie logic, compliance, and data shapes.
> Updated 2026-10-20.

---

## Phase Model

### Program Phases (in order)
| Phase | Duration | Fixed? | calorie_cut | calorie_bank | calorie_mode |
|---|---|---|---|---|---|
| loading | 2 days | Yes | 1.00 | 0 | none |
| activation | 8 days (default, per-user via `activation_days`) | No | 1.00 | 0 | none |
| transition | 3 days | Yes | 1.00 | 0 | none |
| stabilization | 18 days | Yes | 1.00 | 0 | none |
| maintenance | ongoing | No | 0.95 | 1 | tdee_mult |
| recomposition | ongoing | No | 0.90 | 1 | tdee_mult |

### Non-Program Phases
| Phase | Purpose | calorie_mode |
|---|---|---|
| tracker | Generic tracking (no program) | fixed |
| keto | Keto program (planned) | fixed |
| weight_loss | Weight loss program (planned) | fixed |

### Phase Resolution (`phaseFor()`)
Located in `packages/shared/src/phases.ts`. Determines current phase from day number and profile.

```
Day 1-2                    → loading
Day 3 to (2 + activation)  → activation
Next 3 days                → transition
Next 18 days               → stabilization
Beyond                     → phase_mode (maintenance/recomposition/tracker)
```

Key functions:
- `phaseFor(dayNum, profile)` returns `{ key, name, color, dayInPhase, totalDaysInPhase }`
- `phaseBands(profile)` returns array of `{ key, from, to }` for timeline rendering
- `activationDays(profile)` returns user's activation length (default 8)
- `resetDayCount(profile)` computes total program days

### Phase Registry (D1 `phases` table)
Single source of truth for phase configuration. Each row defines:
- `key` (PK): phase identifier
- `name`, `color`, `sort_order`: display
- `duration_default`, `duration_col`: how long, which `users` column overrides it
- `is_program`: whether this phase is part of the structured program
- `calorie_cut`: multiplier applied to TDEE (0.95 = 5% deficit)
- `calorie_bank`: whether unused calories roll over
- `inherits_rules_from`: fallback phase for missing rules
- `use_buckets`: whether macro buckets (protein/fat/carbs targets) apply
- `calorie_mode`: how calorie target is computed (see Calorie Logic below)

### Phase Mode (`users.phase_mode`)
Determines which phase a user enters after stabilization. Set via admin.
Values: `maintenance` (default), `recomposition`, `tracker`, `keto`, `weight_loss`.

### Phase Transitions (D1 `phase_transitions` table)
Supports automated phase graduation. Schema exists, shared package supports it, but:
- API does not query it in sync/profile routes
- V3 frontend `phaseFor()` ignores it
- No UI to trigger graduation

**Status: not wired up yet.**

---

## Rules Engine

### Rules Table Schema (`rules`)
| Column | Type | Purpose |
|---|---|---|
| phase | TEXT | Phase key (e.g. `activation`, `maintenance`) |
| model | TEXT | Body model (`standard`, `athletic`) |
| metric | TEXT | What's being measured (see Metrics below) |
| basis | TEXT | How `value` is interpreted (see Basis Types) |
| value | REAL | The base value |
| green_lo | REAL | Lower bound for green (compliant) zone |
| green_hi | REAL | Upper bound for green zone |
| amber_lo | REAL | Lower bound for amber (warning) zone |
| amber_hi | REAL | Upper bound for amber zone |
| gated | INTEGER | 1 = metric is enforced, 0 = informational only |
| unit | TEXT | Display unit (kcal, g, ml, etc.) |

### Basis Types
| Basis | Meaning | Example |
|---|---|---|
| `fixed` | Absolute value | water = 2000 ml |
| `per_kg_target_weight` | Multiply by target weight | protein = 1.5 g/kg |
| `adaptive_kcal` | Percentage of current calorie target | fat = 0.25 (25% of kcal) |
| `pct_of_kcal` | Same as adaptive_kcal (legacy alias) | carbs = remaining kcal |
| `none` | No numeric target | exercise = checkbox only |

### Metrics
| Metric | Typical Basis | Notes |
|---|---|---|
| kcal | adaptive_kcal or fixed | Main calorie target |
| protein | per_kg_target_weight | Usually 1.5 g/kg |
| fat | adaptive_kcal | Usually 25% of kcal, converted to grams via /9 |
| carbs | adaptive_kcal | Usually remainder after protein + fat |
| water | fixed | In ml. V3 displays as glasses (divide by 250) |
| exercise | none | Boolean, gated or not per phase |

### Rule Resolution (`ruleFor()`)
Linear scan of all rules for matching `(phase, model, metric)`. Falls back to `inherits_rules_from` phase if no match. No validation that rules exist before displaying UI (missing rules = silent empty state).

### Starter Rules (default seed data)
All program phases have rules for both `standard` and `athletic` models covering: kcal, protein, fat, carbs, water, exercise.

Key differences by phase:
- **Loading/Activation**: strict, low kcal, gated exercise=0
- **Transition**: slightly relaxed
- **Stabilization**: TDEE-based, wider bands
- **Maintenance**: 95% TDEE, calorie bank enabled
- **Recomposition**: 90% TDEE, calorie bank enabled, higher protein

### Known Issues
- Water rendering not fully wired to rules table in V3
- No rule validation on save (can create contradictory bands)
- Linear scan, no indexing (fine at current scale, ~30 rows)

---

## Calorie Logic

### TDEE Calculation (`mifflinTDEE()`)
Located in `packages/shared/src/calories.ts`.

```
BMR = 10 * weight_kg + 6.25 * height_cm - 5 * age + sex_offset
TDEE = BMR * activity_factor
```

- `sex_offset`: male = +5, female = -161
- `sex` comparison: lowercase `'m'` or `'f'` (V2 bug used uppercase `'F'`)
- `activity_factor`: numeric (1.2 sedentary, 1.375 light, 1.55 moderate, 1.725 active, 1.9 very active)

### Calorie Target Modes (`calorie_mode` on `phases` table)
| Mode | Logic |
|---|---|
| `none` | No target (loading, activation, transition, stabilization) |
| `tdee_mult` | TDEE * calorie_cut (maintenance: *0.95, recomposition: *0.90) |
| `fixed` | Use `current_target_kcal` from user profile directly |
| `ramp_then_hold` | Planned, not implemented |

### Effective Target (`effectiveTarget()`)
Located in `apps/web/src/lib/stores/calorie.ts`. Switch on calorie_mode:
1. Look up phase's `calorie_mode`
2. If `tdee_mult`: compute TDEE, multiply by `calorie_cut`
3. If `fixed`: use `profile.current_target_kcal`
4. Apply calorie bank adjustments if enabled

### Calorie Bank
When `calorie_bank = 1` on a phase:
- Unused calories (target minus consumed) roll to next day
- Bank has a cap (configurable)
- Enables flexible daily intake while hitting weekly average

### Known Issues
- `effectiveTarget()` switch handles modes that don't match DB column values (`mifflin`, `stab_tdee`, `stab_target`, `cut`, `ramp`, `adaptive` vs DB's `tdee_mult`, `ramp_then_hold`, `fixed`, `none`)
- Adding a new mode means editing the switch + hoping the string matches

---

## Compliance Bands

Each rule defines green and amber zones as multipliers around the target value:

```
Red low  ← amber_lo ← green_lo ← TARGET → green_hi → amber_hi → Red high
```

Example (protein, target = 90g):
- green: 85-95g (green_lo=0.94, green_hi=1.06)
- amber: 75-105g (amber_lo=0.83, amber_hi=1.17)
- red: below 75g or above 105g

Compliance checking in `packages/shared/src/compliance.ts`.

### Frontend Trends Compliance (v3.1.0+)

The Trends tab uses rules-based compliance for calorie charts:
- `ruleFor(phaseKey, 'kcal')` looks up green_lo/green_hi per phase
- Values are treated as multipliers of the effective target (e.g., 0.9 = 90% of target)
- Falls back to 0.9/1.1 if no rule found
- CalorieBars uses amber_lo/amber_hi for bar coloring (falls back to 0.85/1.1)
- Calorie bank adjustment is added to targets when the phase has `calorie_bank` enabled

---

## Config Keys (D1 `config` table)

Global app configuration. Key-value pairs.

| Key | Purpose | Example |
|---|---|---|
| `app_version` | Current frontend version | `1.46.0` |
| `min_version` | Minimum supported version | `1.40.0` |
| `maintenance_mode` | Enable maintenance screen | `false` |
| `ai_enabled` | Toggle AI features | `true` |

**Note:** `config` is global. No per-user overrides (migration 0016 added `user_config` table for this, but not fully wired).

---

## Data Shapes

### Day Data (`day_json` in `daily_logs`)
Stored as JSON string in D1. Parsed to object in localStorage.

```typescript
{
  day: number,           // Day number (1-based)
  date: string,          // ALWAYS EMPTY STRING (bug: never populated)
  weight: number,        // kg
  waist: number,         // cm
  kcal: number,          // Total calories
  protein: number,       // grams
  fat: number,           // grams
  carbs: number,         // grams
  water: number,         // glasses (V3) or ml (V2/DB)
  exercise: boolean,     // Did exercise today
  notes: string,         // Free text
  meals: Meal[],         // Array of meal entries
  ts: number             // Last save timestamp
}
```

### Meal Object
```typescript
{
  name: string,          // Meal description
  kcal: number,
  protein: number,
  fat: number,
  carbs: number,
  time: string,          // HH:MM
  ts: number             // Logged timestamp
}
```

**Missing from V3 meals (was in V2):** `items[]` with per-ingredient detail, `grams`, `verdict`, `source` field. This blocks meal ordering integration.

### localStorage Key Format
`aevum_<user_id>_day_<number>` (e.g. `aevum_marco_day_1`). Generated by `K()`.

### Profile Object (from `users` table)
```typescript
{
  id: string,
  name: string,
  email: string,
  sex: 'm' | 'f',
  dob: string,           // YYYY-MM-DD
  age: number,
  height: number,        // cm
  start_weight: number,  // kg
  activity: number,      // Activity factor (1.2-1.9)
  target_kg: number,     // Target weight
  start_date: string,    // YYYY-MM-DD
  program: boolean,      // Is on structured program
  phase_mode: string,    // Post-stabilization phase
  current_target_kcal: number,
  activation_days: number,
  loading_days: number,
  transition_days: number,
  stabilization_days: number
}
```

---

## Drift Detection and Adaptive Review

### Concept
System monitors whether actual intake consistently deviates from targets. If drift exceeds threshold over N days, triggers a review suggestion.

### Status
Planned, not yet implemented in V3. The compliance module in `@aevum/shared` has the foundation but no drift aggregation.

---

## Food Hub / Policy

### Foods Table (`foods`)
Per-phase food classifications:
- `phase`, `category`, `subcategory`, `item`
- `verdict`: allowed / limited / not_allowed
- `cap_g`: gram cap for limited items

### Policy Table (`policy`)
Per-phase text rules for AI worker:
- `phase`, `rules_text`
- Used by `resolveRulebook()` in AI Worker
- Sent as context to meal engine, food check, shop list

---

## Body Composition

### Body Scans (`body_scans` table)
| Column | Purpose |
|---|---|
| scan_date | Date of scan |
| scan_type | DEXA, BIA, etc. |
| body_fat_pct | Body fat percentage |
| fat_mass | Fat mass in kg |
| smm | Skeletal muscle mass in kg |
| reference_json | Full scan data as JSON |

Used in Trends tab for body composition tracking over time.

---

## Constants Reference

From `packages/shared/src/constants.ts`:

| Constant | Value | Purpose |
|---|---|---|
| `PH_FIXED` | `{ loading: 2, transition: 3, stabilization: 18 }` | Fixed-length phase durations |
| `PHASE_KEYS` | 9 keys in program order | All known phases |
| `DEFAULT_ACTIVATION_DAYS` | 8 | Fallback activation length |
| `GLASS_ML` | 250 | ml per glass (V3 water conversion) |
| `ALC_WORDS` | 30 words | Alcohol detection for food check |
| `ME.P_PER_KG` | 1.5 | Protein target per kg body weight |
| `ME.C_DAILY` | 50 | Default daily carb cap (g) |
| `ME.EATING_WINDOW_H` | 8 | Intermittent fasting eating window |
| `ME.FASTING_H` | 16 | Intermittent fasting fasting window |
| `ME.SLOTS` | 5 slots | Meal 1, Meal 2, Snack 1, Snack 2, Fruit |
