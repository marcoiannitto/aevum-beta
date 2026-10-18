# AEVUM Codebase — Full Architectural Audit

**Date:** 2026-10-18  
**Scope:** Database, backend (Worker), frontend (index.html), admin panel, auxiliary pages  
**Goal:** Identify structural weaknesses, propose a re-architecture for scalability, modularity, SaaS-readiness, and developer handoff.

---

## 1. Current State Summary

| Layer | File(s) | Lines | Pattern |
|-------|---------|-------|---------|
| Frontend | `index.html` | 4,338 | Single-file SPA — HTML + CSS + JS inline |
| Admin | `admin.html` | 2,579 | Single-file admin panel |
| Backend | `v2-api/src/index.js` | 1,601 | Single-file Cloudflare Worker |
| Database | 13 migration files | D1 (SQLite) | Incremental ALTER TABLE migrations |
| Auxiliary | `calculator.html`, `intake.html`, `privacy.html`, `terms.html`, `health-disclaimer.html` | ~small | Static/semi-static pages |
| Infra | `wrangler.toml` | 19 | Cloudflare Workers config |

**Total app logic: ~8,500 lines across 3 files, zero modules, zero tests, zero types.**

---

## 2. Database Issues

### 2.1 Migration 0013 Duplicate Column Bug
Migration 0010 already adds `calorie_cut` to `phases`. Migration 0013 adds it again → **will fail on apply**. Must remove the duplicate `ALTER TABLE phases ADD COLUMN calorie_cut` from 0013 before running it.

### 2.2 No Phase History Tracking
`users.phase_mode` stores the **current** mode (maintenance/recomposition) but not **when** it changed. `phaseFor(d)` uses the current value for all historical days → any phase switch retroactively relabels the past. This is the root cause of the "Day 32 shows Recomposition when it was Maintenance" bug.

**Fix required:** A `phase_transitions` table or at minimum a `phase_mode_since_day` column.

### 2.3 Redundant Data in `daily_logs`
- `phase` column stores a string label at write time — but `phaseFor(d)` computes phase from day number at read time. These can and do diverge.
- `kcal`, `protein`, `fat`, `carbs` columns are also in `day_json` blob. Two sources of truth for the same data.

### 2.4 No Indexes on Hot Paths
- `daily_logs` is queried by `user_id + day` constantly (the PK handles this via UNIQUE constraint in the UPSERT)
- `meal_plans` queried by `user_id + day` — no index
- `rules` queried by `phase + metric` — no index
- `foods` queried by `phase` — no index

### 2.5 Schema Drift Risk
Migrations use `ALTER TABLE ADD COLUMN` which can't be undone in SQLite. No down-migrations. Combined with no Time Travel on the free plan, schema mistakes are permanent without a manual backup restore.

### 2.6 `day_json` is a God Blob
The entire day's meals, items, verdicts, notes are serialized into one TEXT column. The backend can't query inside it (no JSON functions used). The frontend parses it client-side. This makes server-side analytics, compliance checks, and meal history queries impossible without full-table scans and JS parsing.

---

## 3. Backend Issues (v2-api/src/index.js)

### 3.1 Single-File Monolith (1,601 lines)
Everything lives in one file: routing, auth, CORS, rate limiting, TDEE math, compliance engine, meal engine, AI proxy, admin CRUD, intake form handler. No imports, no modules, no separation.

### 3.2 Action-Based Routing (Anti-Pattern)
All requests go to one endpoint as POST with `body.action`. This means:
- No HTTP method semantics (GET vs POST vs PUT vs DELETE)
- No URL-based routing (can't use Cloudflare route patterns, caching, or analytics)
- Every request parses the full body before knowing what to do
- Intake endpoints are the exception — they use proper URL routing, showing the pattern was known but not applied

### 3.3 TDEE Computation Duplicated 3×
Mifflin-St Jeor formula appears in `doRegister()`, `completeProfile()`, and `updateProfile()`. Each is slightly different in how it gets `age`, `act`, `weight`. A change to the formula requires finding and updating all three.

### 3.4 Rate Limiter is Per-Isolate (Ineffective)
Cloudflare Workers run across hundreds of isolates globally. The in-memory `rateMap` only tracks requests hitting one isolate. A client spreading requests across edge locations bypasses the limiter entirely. This is a known limitation but should be documented or replaced with Cloudflare's built-in rate limiting.

### 3.5 Meal Engine Constants Hardcoded
The `ME` object (lines 907-945) hardcodes all food lists, cooking methods, seasonings, macro calculations. This is protocol-level business logic baked into code. Changing the allowed protein list requires a code deploy. Should be in the database (the `foods` table exists but isn't used by the meal engine).

### 3.6 SQL Injection Surface in Admin Routes
`adminSeed()` and `adminList()` interpolate `table` directly into SQL: `` `DELETE FROM ${table}` ``. Protected by an allowlist, but the pattern is fragile — adding a table name to the allowlist without thinking creates a risk.

### 3.7 No Input Validation Framework
Every handler does its own parsing with `String(body.x || '')`, `parseFloat(body.x) || 0`, etc. No schema validation, no error aggregation. A missing or malformed field silently becomes `null`, `0`, or empty string rather than returning a clear error.

### 3.8 Compliance Engine Duplicated
`deriveCompliance()` and `computeStats()` run on the backend (for the graduation dashboard) but equivalent logic also runs on the frontend (for daily UI). Two independent implementations of the same business rules, in different languages' worth of style.

### 3.9 Error Handling is Flat
All errors are `{ error: string }`. No error codes, no distinction between validation errors (400), not-found (404), auth errors (401), or server errors (500). The frontend can't programmatically distinguish them except by string matching.

### 3.10 No Middleware Chain
Auth check is done inside the main `fetch()` handler with if-statements. Adding a new cross-cutting concern (logging, input sanitization, response formatting) means editing the single monolithic handler.

---

## 4. Frontend Issues (index.html — 4,338 lines)

### 4.1 Single-File SPA with Everything Inline
HTML structure, CSS styles, and all JavaScript in one file. No components, no modules, no build step. Finding a function means Ctrl+F through 4,338 lines.

### 4.2 Triple State Problem (Root Cause of Most Bugs)
State lives in three places simultaneously:
1. **D1 database** (server truth) — via API calls
2. **localStorage** (offline cache) — synced manually via `hydrateFromBackend()`
3. **`profile` object + global variables** (in-memory runtime) — populated from localStorage on load

Sync between these is manual and incomplete. Examples of drift:
- `phaseFor()` reads `profile.phase_mode` (in-memory) which reflects current DB value, but applies it retroactively
- `calcAdjustedTarget()` reads `dayData(d)` from localStorage, which may not match D1 if sync failed
- `currentDay` is a global that can go stale
- `PHASES_LIST` is loaded once at boot and never refreshed

### 4.3 Global State Everywhere
Key globals include: `profile`, `currentDay`, `PHASES_LIST`, `IS_PROGRAM`, `MAINT_COLOR`, `phaseReg` (the phase registry cache). These are read and mutated from dozens of functions with no encapsulation. Any function can side-effect any state.

### 4.4 No Component System
UI is built by direct DOM manipulation: `document.getElementById()`, `innerHTML` assignments, manual event listener attachment. Changing a UI section means finding all the places that touch those DOM IDs.

### 4.5 Business Logic Mixed with Rendering
Functions like `renderDay()` both compute what to display (phase, targets, compliance) and build the HTML. Testing the computation requires a browser or a DOM mock.

### 4.6 Phase Determination is Stateless and Retroactive
`phaseFor(d)` determines phase purely from day number + current `phase_mode`. It has no memory of what phase_mode was on day `d`. Switching from maintenance to recomposition makes ALL post-stabilization days show as recomposition, including historical ones.

### 4.7 Calorie Logic Scattered
Calorie target computation involves: `maintTarget()`, `calcAdjustedTarget()`, `phaseFor()`, `_phReg()`, `profile.current_target_kcal`, phase registry `calorie_cut`, `bank_window`, clamp values. These are spread across the file with implicit dependencies. Debugging requires tracing 5+ functions.

### 4.8 No Offline-First Architecture
The app uses localStorage as a cache but has no proper sync protocol:
- No conflict resolution (last-write-wins via timestamp, but no merge)
- No queue for failed writes
- No versioning of local data
- `syncDay()` fires on every change, no debouncing or batching

### 4.9 No Error Boundary
API call failures show alerts or silently fail. No retry logic, no offline detection, no graceful degradation.

---

## 5. Admin Panel (admin.html — 2,579 lines)

Same pattern as the frontend: single file, inline everything, direct DOM manipulation. Shares no code with the main app despite needing the same API client, auth handling, and data structures. Any API change must be updated in both files independently.

---

## 6. Cross-Cutting Issues

### 6.1 Zero Tests
No unit tests, no integration tests, no end-to-end tests. Every change is manual testing in production. This is the #1 reason bugs compound — fixing one thing breaks another with no safety net.

### 6.2 Zero Types
No TypeScript, no JSDoc types, no schema validation. The `profile` object shape is implied across 4,338 lines of frontend code. A new developer has to read all the code to understand what fields exist.

### 6.3 No Shared Constants
Phase keys, color codes, metric names, error strings — all duplicated between frontend and backend with no single source of truth.

### 6.4 No Build Pipeline
No bundler, no minifier, no linter, no formatter. Code style is inconsistent (tabs vs spaces, naming conventions vary). No CI/CD beyond the D1 backup action.

### 6.5 Feature Toggles Impossible
To add/remove a feature, you'd need to find every place it's referenced across 8,500 lines and add conditionals. No feature flag system, no config-driven UI.

### 6.6 SaaS Multi-Tenancy
Currently single-tenant by accident (one D1 database, user isolation via `user_id` in queries). But the admin routes, config, phases, rules, foods, recipes are all global — shared across all users. True SaaS would need per-organization config, which the current schema doesn't support.

---

## 7. Proposed Re-Architecture

### 7.1 Target Stack

| Layer | Current | Proposed |
|-------|---------|----------|
| Frontend | Single HTML file | **SvelteKit or Astro** + Svelte components |
| State | localStorage + globals | **Svelte stores** (single reactive state tree) |
| Backend | Single JS file on Workers | **Hono on Workers** (modular router + middleware) |
| Database | D1 raw SQL | D1 + **Drizzle ORM** (typed queries, migrations) |
| Types | None | **TypeScript** everywhere, shared types package |
| Build | None | **Vite** (dev server + bundler) |
| Testing | None | **Vitest** (unit) + **Playwright** (e2e) |

### 7.2 Why These Choices
- **Hono**: Lightweight router built for Workers/edge. Middleware chain, typed routes, <14KB. Drop-in replacement for the current raw `fetch()` handler.
- **Drizzle ORM**: Works with D1 natively. Typed schema, generated migrations, no runtime overhead (compiled to SQL).
- **Svelte/SvelteKit**: Minimal framework overhead, reactive stores solve the triple-state problem, compiles to vanilla JS (small bundle for mobile PWA).
- **Vite**: Standard build tool, works with Svelte, enables code splitting and tree shaking.

### 7.3 Folder Structure

```
aevum/
├── packages/
│   └── shared/              # Shared types, constants, calculations
│       ├── types.ts          # Profile, Day, Phase, Rule, MealPlan
│       ├── phases.ts         # phaseFor(), phaseLens() — one implementation
│       ├── calories.ts       # TDEE, maintTarget(), calcAdjustedTarget()
│       ├── compliance.ts     # deriveCompliance(), bandStatus()
│       └── constants.ts      # Phase keys, colors, metric names
│
├── apps/
│   ├── api/                  # Cloudflare Worker (Hono)
│   │   ├── src/
│   │   │   ├── index.ts      # Hono app, middleware chain
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── cors.ts
│   │   │   │   └── validate.ts  # Zod schema validation
│   │   │   ├── routes/
│   │   │   │   ├── profile.ts
│   │   │   │   ├── sync.ts
│   │   │   │   ├── rules.ts
│   │   │   │   ├── meals.ts
│   │   │   │   ├── graduation.ts
│   │   │   │   ├── ai.ts
│   │   │   │   ├── intake.ts
│   │   │   │   └── admin.ts
│   │   │   ├── db/
│   │   │   │   ├── schema.ts    # Drizzle schema
│   │   │   │   └── queries.ts   # Reusable query functions
│   │   │   └── services/
│   │   │       ├── tdee.ts      # imports from shared/calories
│   │   │       ├── compliance.ts
│   │   │       └── meal-engine.ts
│   │   ├── migrations/
│   │   └── wrangler.toml
│   │
│   ├── web/                  # SvelteKit frontend
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── stores/
│   │   │   │   │   ├── profile.ts    # Single source of truth
│   │   │   │   │   ├── days.ts       # Day data store
│   │   │   │   │   ├── phases.ts     # Phase registry store
│   │   │   │   │   └── sync.ts       # Sync engine (queue, retry, conflict)
│   │   │   │   ├── api/
│   │   │   │   │   └── client.ts     # Typed API client
│   │   │   │   └── components/
│   │   │   │       ├── DayCard.svelte
│   │   │   │       ├── MealLogger.svelte
│   │   │   │       ├── PhaseBar.svelte
│   │   │   │       ├── CalorieRing.svelte
│   │   │   │       └── ...
│   │   │   ├── routes/
│   │   │   │   ├── +page.svelte      # Main tracker
│   │   │   │   ├── fitness/
│   │   │   │   ├── recipes/
│   │   │   │   └── settings/
│   │   │   └── app.html
│   │   └── svelte.config.js
│   │
│   └── admin/                # Admin panel (SvelteKit or separate)
│       └── ...
│
├── tests/
│   ├── unit/                 # Vitest
│   │   ├── calories.test.ts
│   │   ├── phaseFor.test.ts
│   │   └── compliance.test.ts
│   └── e2e/                  # Playwright
│
└── turbo.json / pnpm-workspace.yaml
```

### 7.4 State Management (Fixing the Triple State)

**Current:** D1 ↔ localStorage ↔ profile object (manual sync, drift-prone)

**Proposed:** Single reactive store with sync layer

```
┌─────────────────────────────────┐
│  Svelte Store (single truth)    │
│  profile, days, phases, rules   │
├─────────────────────────────────┤
│  Sync Engine                    │
│  - Write queue (IndexedDB)      │
│  - Conflict resolution          │
│  - Retry with backoff           │
│  - Online/offline detection     │
├─────────────────────────────────┤
│  D1 API (Hono backend)          │
└─────────────────────────────────┘
```

Key principles:
1. **Store is the only state** — components read from store, never from localStorage or globals
2. **Writes go to store first** (optimistic), then queue for API sync
3. **Sync engine handles** retry, conflict, offline — invisible to components
4. **Phase transitions are events** — stored in a `phase_transitions` table, not derived from current state

### 7.5 Feature Toggles for SaaS

Add a `features` table and a per-user `feature_overrides`:

```sql
CREATE TABLE features (
  key TEXT PRIMARY KEY,
  default_enabled INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'free'  -- free, pro, enterprise
);

CREATE TABLE user_features (
  user_id TEXT,
  feature_key TEXT,
  enabled INTEGER,
  PRIMARY KEY (user_id, feature_key)
);
```

Frontend loads features at boot, components check `$features.has('calorie_bank')` before rendering. Backend validates feature access on relevant endpoints.

### 7.6 Phase History (Fixing phaseFor Bug)

```sql
CREATE TABLE phase_transitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  from_mode TEXT,
  to_mode TEXT NOT NULL,
  from_day INTEGER,
  effective_day INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

`phaseFor(d)` then queries the transition history:
- For fixed-duration phases (loading, activation, transition, stabilization): unchanged
- For open-ended phases: find the latest transition where `effective_day <= d`, use that mode

---

## 8. Migration Plan (Prioritized)

### Phase 1: Foundation (Low Risk, High Impact)
1. **Add TypeScript + shared types package** — Define `Profile`, `Day`, `Phase`, `Rule` types once
2. **Extract shared logic** — `phaseFor()`, TDEE calc, compliance engine → shared package, with unit tests
3. **Fix migration 0013** — Remove duplicate `calorie_cut` column, apply migration
4. **Add phase_transitions table** — Fix the retroactive phaseFor bug
5. **Add indexes** — `meal_plans(user_id, day)`, `rules(phase, metric)`, `foods(phase)`

### Phase 2: Backend Restructure (Medium Risk)
6. **Switch to Hono router** — One route file per domain, middleware for auth/cors/validation
7. **Add Drizzle ORM** — Typed schema, replace raw SQL strings
8. **Add Zod validation** — Request schemas per route, clear error messages
9. **Deduplicate TDEE** — One function in shared, called from all registration/profile paths
10. **Move ME constants to DB** — Food lists, cooking methods → `foods` + `cooking_methods` tables

### Phase 3: Frontend Restructure (Higher Risk, Bigger Payoff)
11. **Set up Vite + Svelte** — Scaffold project, basic routing
12. **Build sync engine** — Store + write queue + retry, replacing manual localStorage sync
13. **Extract components** — DayCard, MealLogger, PhaseBar, CalorieRing
14. **Migrate page by page** — Start with settings (simplest), then day view, then meal logger
15. **Build admin in same framework** — Share API client and types

### Phase 4: Quality + SaaS (After Restructure)
16. **Add Vitest unit tests** — Priority: phaseFor, calorie calculations, compliance
17. **Add Playwright e2e** — Core flows: login, log meal, view day, change phase
18. **Add feature toggles** — Features table, frontend gate, backend validation
19. **CI/CD pipeline** — Build + test + deploy on push to main
20. **Error monitoring** — Sentry or equivalent for frontend + Worker errors

---

## 9. Quick Wins (Can Do Now Without Restructuring)

These fixes can be applied to the current codebase today:

| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| 1 | Fix migration 0013 duplicate column | 5 min | Unblocks migration |
| 2 | Add `phase_mode_since_day` to users + update `phaseFor()` | 1 hr | Fixes retroactive phase bug |
| 3 | Add missing DB indexes | 10 min | Query performance |
| 4 | Extract TDEE calc to one function in index.js | 30 min | Remove duplication |
| 5 | Add `// SECTION:` comments to index.html for navigation | 30 min | Developer experience |
| 6 | Add basic error codes to API responses | 1 hr | Frontend can handle errors properly |

---

## 10. Risk Assessment

| Risk | Current Severity | After Re-Architecture |
|------|-----------------|----------------------|
| Bug from state drift | **HIGH** (happens regularly) | Low (single store) |
| Breaking change on deploy | **HIGH** (no tests) | Low (unit + e2e tests) |
| New developer onboarding | **HIGH** (8.5K lines, no docs) | Low (typed, modular, tested) |
| Feature addition time | **HIGH** (touch all 3 files) | Low (isolated components + routes) |
| Data loss from bad migration | **MEDIUM** (no down-migrations) | Low (Drizzle managed migrations) |
| Scaling beyond 1 practitioner | **BLOCKED** (global config) | Possible (feature flags + org scoping) |

---

## 11. What NOT to Change

- **Cloudflare Workers + D1**: Correct choice for this scale. Low cost, global edge, good enough performance.
- **PWA approach**: Right for mobile-first health tracking.
- **Phase registry in DB**: Good design decision (migration 0007). Just needs the calorie rules engine applied (0013, once fixed).
- **Daily backup to GitHub**: Solid insurance for a free-tier DB.
- **Calorie bank concept**: The rolling-window smoothing is good UX. Just needs clean implementation.
