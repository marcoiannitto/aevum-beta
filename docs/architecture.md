# AEVUM Architecture

> Single source of truth for developers. Updated 2026-10-29.
> Business docs (brand, compliance, briefs, copy) live in the Claude project.

---

## Deployments

Two deployments exist. V2 has been retired (2026-10-27). V3 is the sole active frontend.

| | V1 Live (legacy) | V3 (primary) |
|---|---|---|
| Frontend repo | `aevum-app` (main) | `aevum-beta` (`main`) |
| Domain | `app.niramaya.sg` (V1 tracker only) | `app.niramaya.sg` (via Cloudflare Pages) |
| API | GAS via Proxy Worker | `aevum-api-v2` Worker |
| Data store | Google Sheet | D1 `aevum-db` |
| Deploy | GitHub Pages (auto) | `deploy.ps1` from local machine |

**V2 retirement (2026-10-27):** V2 frontend decommissioned. DNS CNAME for `app.niramaya.sg` switched from GitHub Pages to Cloudflare Pages (`aevum-web-d75.pages.dev`). GitHub Pages disabled. Branch `feat/monorepo-restructure` merged into `main`. Migration `v3.1.7-date-key.sql` confirmed applied (UNIQUE(user_id, date)). V3 sync rejects empty-date payloads (commit 08262ee).

---

## Tech Stack

### V3 Monorepo
- **Frontend:** SvelteKit 2 + Svelte 5 (runes: `$props()`, `$state()`, `$derived()`)
- **Backend:** Hono on Cloudflare Workers (planned, currently uses V2 worker)
- **Shared:** `@aevum/shared` TypeScript package (types, phases, calories, compliance, constants). 34 tests passing.
- **Build:** pnpm workspaces + Turborepo
- **DB:** Cloudflare D1 (SQLite), database `aevum-db` (ID: `54b6f636-ceac-41e6-bad9-60d970c78b33`)

### V2 Beta
- **Frontend:** Vanilla JS SPA (`index.html`, `admin.html`, `calculator.html`, `intake.html`)
- **Backend:** Single Cloudflare Worker (`v2-api/src/index.js`)
- **Auth:** Token-based (UUID per user in `auth_tokens`) + Google Sign-In

---

## Repo Structure

### V3 (`main`)
```
aevum-app-v3/
├── apps/
│   └── web/                    # SvelteKit frontend (Svelte 5)
│       ├── src/
│       │   ├── lib/
│       │   │   ├── api/client.ts       # API client (POST with Bearer auth)
│       │   │   ├── components/
│       │   │   │   └── admin/UserDetail, AdminPrograms, AdminProgramDetail, AdminPhaseEditor, AdminCalorieTuning, AdminClientCalories
│       │   │   └── stores/
│       │   │       ├── auth.ts          # Auth store (pid, profile, isProgram)
│       │   │       ├── day.ts           # Day store (loadDay, saveDay, syncDay)
│       │   │       ├── phases.ts        # Phase registry (phaseFor, phaseLens)
│       │   │       ├── calorie.ts       # Calorie targets + bank
│       │   │       ├── rules.ts         # Rules engine
│       │   │       └── ...
│       │   └── routes/
│       ├── svelte.config.js
│       └── package.json
├── packages/
│   └── shared/                 # @aevum/shared (types, phases, calories, compliance, constants)
│       └── src/
│           ├── constants.ts    # PH_FIXED, PHASE_KEYS, PhaseMode, ME, ALC_WORDS
│           ├── phases.ts       # phaseFor(), phaseBands(), activationDays()
│           ├── calories.ts     # mifflinTDEE(), dobToAge(), num(), isTruthy()
│           ├── client-calories.ts # computeClientCalories() server-side per-user calorie status
│           ├── compliance.ts   # Compliance checking
│           └── types.ts        # Shared TypeScript types
├── docs/                       # Technical documentation (this folder)
├── deploy.ps1                  # Deploy script (local machine only)
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

### V2 (retired, files remain in repo for reference)
```
v2-api/                         # Backend Worker (still in use, shared with V3)
├── src/index.js                # Entire backend (single Worker file)
├── migrations/                 # D1 migration files (0001-0021)
└── wrangler.toml               # Worker config + D1 binding
```

### V3 Key Files and V2 Equivalents
| V3 | V2 | Purpose |
|---|---|---|
| `apps/web/src/lib/stores/day.ts` | `index.html` syncDay/saveDay | Day data + sync |
| `apps/web/src/lib/stores/phases.ts` | `index.html` phaseFor/PHASES | Phase registry |
| `apps/web/src/lib/stores/auth.ts` | `index.html` auth/profile/PID | Auth + profile |
| `apps/web/src/lib/api/client.ts` | `index.html` postJSON | API client |
| `apps/web/src/lib/components/admin/UserDetail.svelte` | `admin.html` | Admin daily logs |

---

## D1 Schema

### Tables
| Table | Type | Key Columns |
|---|---|---|
| `auth_tokens` | auth | token, user_id, role, created_at, expires_at |
| `users` | per-user | id, name, email, sex, dob, age, height, start_weight, activity, target_kg, start_date, activation_days, loading_days, transition_days, stabilization_days, program, current_target_kcal, phase_mode |
| `daily_logs` | per-user | user_id, day, phase, date, weight, waist, kcal, protein, fat, carbs, water_ml, exercise, notes, day_json |
| `meal_plans` | per-user | user_id, day, meal, recipe, kcal, protein, fat, carbs, meal_type, meal_slot, components_json |
| `body_scans` | per-user | id, user_id, scan_date, scan_type, body_fat_pct, fat_mass, smm, reference_json |
| `intake_tokens` | intake | token (PK), client_name, prefill_json, response_json, status |
| `phases` | reference | key (PK), program_id, name, color, sort_order, duration_default, duration_col, is_program, inherits_rules_from, calorie_mode, target_mode, calorie_cut, target_fixed_lo, target_fixed_hi, ramp_from, ramp_days, ramp_pct, calorie_bank, bank_window, bank_clamp_lo, bank_clamp_hi, bank_grace_days, weekly_tolerance, weight_goal, weight_goal_rate, drift_enabled, drift_review_days, drift_step_kcal, drift_band_kg, drift_floor_kcal, use_buckets, gate_fat, gate_carb, requires_serum, has_fasting, show_in_phase_bar, show_in_recipe_chips, food_rule_line, fitness_intro, explainer_json |
| `rules` | reference | phase, model, metric, basis, value, green_lo, green_hi, amber_lo, amber_hi, gated, unit |
| `foods` | reference | phase, category, subcategory, item, verdict, cap_g |
| `policy` | reference | phase, rules_text |
| `config` | reference | key, value |
| `recipes` | reference | name, protein, cuisine, phase, kcal, protein_g, fat_g, carbs_g |
| `ingredients` | reference | id (PK), name, category, per_100g_kcal/p/f/c |
| `catered_menu` | reference | id, category, name, per_serving_kcal/p/f/c, serving_g |
| `messages` | reference | trigger, enabled, phase, priority, title, body |
| `movements` | reference | name, phase, equipment, video_url, cues |
| `workouts` | reference | workout_id, workout_name, phase, movement_id, sets, reps |

### D1 Migrations
| File | Purpose | Status |
|---|---|---|
| `0001_init.sql` | Initial schema | Applied |
| `0001_meal_plan_builder.sql` | Ingredients, catered_menu, meal_plans extensions | Applied |
| `0002_intake_form.sql` | intake_tokens table | Applied |
| `0003_users_intake_token.sql` | users.intake_token column | Applied |
| `0004_body_scans.sql` | body_scans table | Applied |
| `0005_scan_reference.sql` | body_scans.reference_json | Applied |
| `0006_phase_lengths.sql` | Per-client phase lengths on users | Applied |
| `0007_phase_registry.sql` | phases table + phase_mode on users | Applied |
| `0008_phase_bar_flags.sql` | show_in_phase_bar, show_in_recipe_chips | Applied |
| `0009_recomposition_phase.sql` | Recomposition phase row | Applied |
| `0010_macro_rules.sql` | calorie_cut + macro_rules on phases | Applied |
| `0011_rules_consolidation.sql` | Macro rules from phases JSON into rules table | Applied |
| `0012_water_rule.sql` | Recomposition water rule | Applied |
| `0013_calorie_rules_engine.sql` | Calorie rules engine columns on phases | NOT APPLIED (bug: calorie_cut already exists) |
| `0014_phase_transitions.sql` | Phase transitions table | Applied |
| `0015_orders.sql` | Orders table | Applied |
| `0016_user_config.sql` | Per-user config overrides | Applied |
| `0017_water_rules_all_phases.sql` | Seed flat 2.5L water rules for all phases (recomp already has 0.04 L/kg) | Pending |
| `0018_programs.sql` | programs table (id, name, description, color, sort_order, is_active) | Applied |
| `0019_fix_phases.sql` | Dedup phases, assign program_id to existing phases | Applied |
| `0020_calorie_bank_columns.sql` | Add calorie engine columns to phases: target_mode, target_fixed_lo/hi, ramp_from, ramp_days, ramp_pct, bank_window, bank_clamp_lo/hi, bank_grace_days, weekly_tolerance, weight_goal, weight_goal_rate, drift_*, gate_fat, gate_carb | Applied |
| `0021_recomposition_bank_config.sql` | Fix recomposition bank config missed by 0020: bank_window=7, clamp 0.60/1.30 | Pending |

---

## API

### V2 Worker (`aevum-api-v2.marco-iannitto.workers.dev`)
- Source: `v2-api/src/index.js`
- D1 binding: `aevum-db`
- CORS: `ALLOWED_ORIGIN` env var (defaults to `https://app.niramaya.sg`), also allows `localhost`

### Calling Conventions
- **`postJSON(url, body, ct, ms)`**: The ONLY function to call the V2 API. Includes `Authorization: Bearer <token>`. On 401, clears token and shows login.
- **`aiPost(payload, ms)`**: AI Worker calls only. Raw fetch WITHOUT auth header. The AI Worker CORS does NOT allow Authorization.
- **NEVER use raw `fetch()` for V2 API calls.**

### API Actions
| Action | Auth | Purpose |
|---|---|---|
| `auth_google` | none | Google Sign-In, returns token + user |
| `login` | none | Login with existing token |
| `register` | none | Create free account |
| `profile` | user | Get user profile |
| `complete_profile` | user | Set profile fields after Google auth |
| `update_profile` | user | Update user fields (including phase_mode) |
| `sync` | user | Save daily log |
| `getdays` | user | Fetch daily logs (uses auth.user_id, NOT body.id) |
| `settarget` / `savetarget` | user | Save target weight |
| `rules` | user | Get phase rules |
| `config` | user | Get app config |
| `messages` / `recipes` / `fitness` / `foods` / `policy` | user | Get reference data |
| `phases` | user | Get phase registry |
| `graduation` | user | Handle phase graduation |
| `mealplan` | user | Get user meal plan |
| `mealengine` / `estimate` / `foodcheck` / `shoplist` | user | AI features |
| `admin_users` / `admin_export` / `admin_update_user` | admin | User management |
| `admin_seed` / `admin_list` / `admin_import` | admin | Reference table CRUD |
| `admin_mealplan` (sub: save/delete/copy/ingredients/catered) | admin | Meal plan builder |
| `admin_intake_*` | admin | Intake management |
| `admin_user_create` / `admin_user_delete` | admin | User CRUD |
| `admin_scan_save` / `admin_scan_list` / `admin_scan_delete` | admin | Body scans |
| `admin_programs` (sub: list/create/update) | admin | Program CRUD |
| `admin_phase_save` / `admin_phase_delete` | admin | Phase upsert (INSERT OR REPLACE) and delete |
| `admin_client_calories` | admin | Per-user calorie dashboard (TDEE, target, bank, verdict) |

### Public Intake Routes (REST-style)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v2/intake/:token` | Load form |
| PUT | `/api/v2/intake/:token/save` | Auto-save progress |
| POST | `/api/v2/intake/:token/submit` | Final submission |

---

## Auth Model

- Token-based: UUID per user in `auth_tokens` table
- Roles: `user` or `admin`
- Google Sign-In via Google Identity Services
- Client ID: `1030416202284-fab2qo7gorekbbjhln8dj5sfethha2ea.apps.googleusercontent.com`
- Consent screen: TESTING MODE (only manually added test users)
- Token stored in localStorage (`aevum_auth_token`), sent as `Authorization: Bearer <token>`

---

## Sync Model (D1 <-> localStorage)

### localStorage to D1 (`syncDay`)
Called on every `saveDay()`. Sends flat columns + `day_json`. Uses `postJSON` with auth.

**V3 conversions in syncDay:**
- `water_ml: (day.water || 0) * 250` (glasses to ml)
- `phase: phaseFor(num, get(profile)).key`

### D1 to localStorage (`hydrateFromBackend`)
Called on `boot()`. Compares JSON length: overwrites local when D1 has richer data.

### Key Format
V3: `aevum_<user_id>_day_<YYYY-MM-DD>` (date-keyed). Generated by `K()`.
V2 (legacy): `aevum_<user_id>_day_<number>`. V3 includes `migrateToDateKeys()` for one-time migration.

### Sync Guards (added 2026-10-26)
- **F-1 Boot race:** `booted` flag prevents save/sync before profile loads (handleVisibility, handleBeforeUnload guarded)
- **F-2 Blank day:** syncDay() skips if no meals, no weight, no water
- **F-3 ORDER BY date:** All backend queries ORDER BY date (not day number)
- **F-4 Server-side day derivation:** adminExport derives day number from date + program_start_date
- **Empty date rejection:** syncRow() returns error if `body.date` is missing (blocks V2-style syncs)

### Known Sync Issues
- No conflict resolution (last write wins, guarded by updated_at comparison)
- No optimistic locking
- `hydrateFromBackend()` has a fallback `dateForDay(row.day)` for legacy rows with empty date (uses `start_date`, not `program_start_date`, which would be wrong for program-switched users, but only fires on V2-era data)

---

## Deploy

### V3 (local machine only)
Cloud container cannot deploy (proxy blocks `sparrow.cloudflare.com:443`).

**`deploy.ps1` (PowerShell):**
1. `git pull origin main`
2. `pnpm build`
3. `npx wrangler pages deploy .svelte-kit/cloudflare --project-name=aevum-web`

**Git workflow:** Claude commits + pushes from cloud > Marco pulls locally > runs `deploy.ps1`

**Cloudflare Pages:** Custom domain `app.niramaya.sg` configured. Automatic deployments disabled (manual deploy via `deploy.ps1` only).

### D1 Access
- **Console:** Cloudflare Dashboard > D1 > `aevum-db`
- **DB ID:** `54b6f636-ceac-41e6-bad9-60d970c78b33`
- Cannot access from cloud container (no API token, proxy blocks wrangler)
- Use wrangler@3 only. v4 breaks the setup.

---

## AI Worker (`sweet-fire-a436.marco-iannitto.workers.dev`)

Shared by V1 and V2. Four routes:

| Route | Model | Purpose |
|---|---|---|
| `estimate` | Sonnet | Meal macro estimation |
| `foodcheck` | Haiku | Ingredient validation against Policy |
| `shoplist` | Haiku | Shopping list generation |
| `mealbuilder` | Sonnet | Phase-aware meal building |

- CORS does NOT include Authorization in allowed headers
- `resolveRulebook()`: uses `body.policy` from Policy tab, falls back to hardcoded rules
- Atwater guard: recomputes kcal as 4P+9F+4C, overrides if off >15%

---

## V1 Live Architecture

Six frontend apps + two Workers + GAS backend + Google Sheet.

| Component | URL | Notes |
|---|---|---|
| Tracker | `app.niramaya.sg` (v1.31.0) | Main app |
| Dashboard | `clients-dashboard.html` (v1.4.0) | Coach view, raw GAS URL |
| Report | `report.html` (v1.1.0) | Graduation report, raw GAS URL |
| Reset Report | `report-reset.html` (v1.0.0) | Mid-program report, raw GAS URL |
| Meal-builder | `meal-builder.html` (v1.3.1) | Food gate tool, raw GAS URL |
| API Proxy | `aevum-api.marco-iannitto.workers.dev` | Hides GAS URL, CORS, rate limit 60/min |

Known tech debt: dashboard, report, reset report, meal-builder still have raw GAS URL exposed.

---

## Google OAuth

- Console project configured
- Authorized origins: `https://app.niramaya.sg`, `https://aevum-web-d75.pages.dev`, `http://localhost:8080`
- Consent screen in TESTING MODE

---

## Brand / Design Tokens

- Fonts: Fraunces (serif), Inter (sans-serif)
- Phase colors: loading=#8a8a8a, activation=#B08D2E, transition=#d8b95e, stabilization=#4a463f, maintenance=#3E7A6A, recomposition=#4A6FA5
- CSS vars: `--ink` #1A1A1A, `--gold` #B08D2E, `--paper` #FBFAF7, `--card` #ffffff, `--line` #EBE5D8, `--muted` #938c7d
- `GLASS_ML = 250` (V3 constant for glass to ml conversion)

---

## Constraints / Gotchas

- PowerShell uses `;` not `&&` for command chaining
- Cloud container proxy blocks Cloudflare API access
- Phone may serve stale CDN cache (cache-busting meta tags added v1.34.0)
- V3 overwrites DB on old code: always deploy code fix FIRST, then fix DB
- `admin_seed` is destructive (wipes + re-inserts entire table)
- D1 free plan: no Time Travel. Daily backups via GitHub Actions.
