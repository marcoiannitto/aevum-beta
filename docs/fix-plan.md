# AEVUM Tracker -- Fix Plan

> Branch: `main`
> Created: 2026-10-23

---

## Tier 1: Data Integrity

### #56 -- Profile: sex and activity not showing after signup

| | |
|---|---|
| **Root cause** | Register endpoint (`auth.ts:47`) returns `{ id, token, program, current_target_kcal }` but NOT `sex` or `act`. Profile re-fetch right after may fail silently (token store not flushed yet, empty catch at line 191). If re-fetch fails, profile never gets sex/act. Separate admin bug: `adminUpdateUser` maps `act` to column `act` instead of `activity`. |
| **Solution** | 1. Include `sex` and `act` in register response. 2. Await store flush before profile re-fetch (belt and suspenders). 3. Fix admin `act` column mapping in `admin.ts:134`. |
| **Files** | `apps/api/src/routes/auth.ts` (line 47), `apps/web/src/routes/(public)/login/+page.svelte` (lines 180-191), `apps/api/src/routes/admin.ts` (lines 118, 134) |
| **Impact** | Current: fixes silent data loss on signup. Future: no structural change. |
| **Risk** | Low. Additive response fields, existing clients ignore extras. |

---

### #52 -- Phase change is retroactive

| | |
|---|---|
| **Root cause** | `syncDay()` (`day.ts:228`) recomputes phase via `phaseFor(dayNum, profile)` on every save. If `phase_mode` changes, all historical days get overwritten on next sync. Phase is NOT in `day_json` (only in the `daily_logs.phase` column, which gets overwritten). |
| **Solution** | 1. Add `phase?: string` to `DayData` interface (`day.ts:98`). 2. In `syncDay()`, stamp phase into day object before `JSON.stringify`; only compute for NEW days (if `day.phase` already exists, keep it). 3. Backfill: one-time script reads all `daily_logs`, stamps current `phase` column value into `day_json`, re-saves. |
| **Files** | `apps/web/src/lib/stores/day.ts` (lines 98, 228), `apps/api/src/routes/sync.ts` (line 15) |
| **Impact** | Current: changes `DayData` shape (additive, backward-compatible). Sync becomes write-once for phase. Future: unblocks #57 (phase-aware stats). |
| **Risk** | Medium. Backfill touches all historical data. Needs careful testing. |

---

## Tier 2: Core UX

### #49 -- Meal add UI: match V2 style

| | |
|---|---|
| **Root cause** | V3 consolidated V2's three-tab design (Describe/Ingredients/Photo) into a two-step Quick/Manual flow. This dropped: Ingredients tab entirely, always-visible macro grid with phase-aware max labels, traffic light food compliance flags, AI disclaimer text. |
| **Solution** | Rewrite `MealLogSheet.svelte` to restore: 1. Three-tab layout (Describe, Ingredients, Photo). 2. Ingredients mode with per-ingredient add/remove + AI calculate. 3. Always-visible macro grid below tabs with `ruleFor()` phase-aware max labels. 4. Traffic light flags for activation/transition phases. 5. AI disclaimer text. |
| **Files** | `apps/web/src/lib/components/meals/MealLogSheet.svelte` |
| **Impact** | Current: UI-only, no backend changes. Future: enables proper meal ingredient tracking. |
| **Risk** | Medium. Largest UI change in this batch. Needs V2 reference for pixel match. |

---

### #48 -- Meal time edit after logging

| | |
|---|---|
| **Root cause** | **Likely already implemented.** `Timeline.svelte` (lines 77-94, 108-121) has time-edit: tap time, inline `<input type="time">` appears, `commitTime()` saves to `$dayData.meals[i].time`. |
| **Solution** | Verify on device. If broken, likely mobile-specific (iOS `autofocus` on line 116 may not trigger). |
| **Files** | `apps/web/src/lib/components/meals/Timeline.svelte` |
| **Impact** | None if working. Minor if needs iOS fix. |
| **Risk** | Negligible. |

---

### #47 -- ProgramPicker popup renders below profile sheet

| | |
|---|---|
| **Root cause** | Z-index conflict. ProfilePanel: scrim 950, panel 951. Sheet.svelte (used by ProgramPicker): scrim 900, sheet 901. Sheet renders behind profile panel (901 < 950). |
| **Solution** | Bump `Sheet.svelte` z-index to 1000/1001 (lines 59, 67). Sheet is a general overlay, should always be on top. |
| **Files** | `apps/web/src/lib/components/ui/Sheet.svelte` (lines 59, 67) |
| **Impact** | Current: CSS only. Future: all Sheet-based overlays will correctly stack above other panels. |
| **Risk** | Low. Check no other component relies on being above z-index 1000. |

---

### #53 -- Signup: activity labels wrong

| | |
|---|---|
| **Root cause** | Frontend defaults in `config.ts:26` already have frequency-based labels. But `loadConfig()` fetches from D1 `config` table, which may have legacy vague labels (Sedentary, Light, etc.) that override the good defaults. |
| **Solution** | Data fix: update or delete the `act_labels` row in D1 `config` table so frequency-based defaults apply. No code change needed. |
| **Files** | D1 `config` table (not code) |
| **Impact** | Current: display only, stored values are numeric factors (unaffected). Future: none. |
| **Risk** | Negligible. |

---

## Tier 3: Feature Work

### #57 -- Phase-aware statistics

| | |
|---|---|
| **Root cause** | `TrendsTab.svelte` computes all stats globally. `collectSeries()` (line 76) scans all days with no phase filter. Weight/waist stats use first vs last entry across ALL days. |
| **Solution** | 1. Add phase selector UI to TrendsTab (dropdown or tabs). 2. Filter `collectSeries()` output by selected phase. 3. Recompute weight/waist/compliance stats on filtered data. 4. Read phase from `day.phase` (stamped by #52) instead of recomputing. |
| **Files** | `apps/web/src/lib/components/trends/TrendsTab.svelte` |
| **Impact** | Current: new UI element + data filtering. Future: enables meaningful per-phase analysis. |
| **Risk** | Low. Additive feature. Depends on #52 for reliable data. |
| **Depends on** | #52 |

---

### #54 -- Free tier: show locked program selector

| | |
|---|---|
| **Root cause** | Free signup flow (`login/+page.svelte`, view `'free'`, lines 273-322) has no mention of programs at all. |
| **Solution** | Add a disabled/greyed-out ProgramPicker card in the free signup form showing "AEVUM Program" as locked with "Available on paid tiers" label. |
| **Files** | `apps/web/src/routes/(public)/login/+page.svelte` (around line 313) |
| **Impact** | Current: UI addition only. Future: marketing/conversion for paid tiers. |
| **Risk** | Negligible. |

---

### #55 -- Program logic: define and verify

| | |
|---|---|
| **Root cause** | Multiple gaps: 1. Registration does NOT set `program_id` (relies on DB default). 2. No `phase_mode` set during registration. 3. `setProgram` updates `program_id` but does NOT reset `start_date`, `phase_mode`, or day count. 4. No validation that `phase_mode` matches available phases for the assigned program. 5. Legacy `program` (boolean) and `program_id` (string) coexist confusingly. |
| **Solution** | Needs design input from Marco: What should happen when a user switches programs? Full reset? Keep history? This is scope TBD. |
| **Files** | `apps/api/src/routes/programs.ts`, `apps/api/src/routes/auth.ts`, `apps/web/src/lib/stores/programs.ts` |
| **Impact** | Current: no immediate breakage (only one active program). Future: critical if multiple programs go live. |
| **Risk** | High if done wrong. Needs careful spec before implementation. |

---

## Tier 4: Polish + Calorie Engine

### #50 -- Admin sidebar: make sticky

| | |
|---|---|
| **Root cause** | Sidebar CSS already has `position: sticky; top: 0; height: 100vh`. May already work. If not, the issue is `.admin-main` having `overflow-y: auto` creating a separate scroll context. |
| **Solution** | Verify visually. If broken: add `overflow-y: auto; max-height: 100vh` to `.sidebar`, remove `height: 100vh`. |
| **Files** | `apps/web/src/lib/components/admin/AdminSidebar.svelte` (lines 63-64) |
| **Impact** | Admin only. |
| **Risk** | Negligible. |

---

### #51 -- Admin sidebar: reorder menu

| | |
|---|---|
| **Root cause** | Menu defined in `admin.ts` (lines 225-255). Current order is already People, Intakes, then reference tables. May already match desired order. |
| **Solution** | Needs Marco's confirmation on exact desired grouping. |
| **Files** | `apps/web/src/lib/stores/admin.ts` (lines 225-255) |
| **Impact** | Admin only. |
| **Risk** | Negligible. |

---

### #37e -- Calorie engine tests

| | |
|---|---|
| **Root cause** | `packages/shared/tests/calories.test.ts` exists but only covers `mifflinTDEE`, `dobToAge`, `num`, `isTruthy`. No tests for store-level functions. |
| **Solution** | Write Vitest tests with localStorage mock for: `effectiveTarget()` (3 branches), `rollingWeight()`, `liveTDEE()`, `calorieBank()` (scaffold), `mifflin()`. Roughly 15-20 test cases. |
| **Files** | New test file in `apps/web/src/lib/stores/` or `packages/shared/tests/` |
| **Impact** | Current: none (tests only). Future: safety net for #37b and #37c. |
| **Risk** | None. |

---

### #37b -- ramp_then_hold target mode

| | |
|---|---|
| **Root cause** | `effectiveTarget()` (calorie.ts:86) has 3 branches: `fixed`, `tdee_mult`, default. Missing `ramp_then_hold`. |
| **Solution** | Add switch case with linear interpolation from `ramp_from` to liveTDEE over `ramp_days`, then hold. DB migration needed for `ramp_from` and `ramp_days` columns on `phases` table. |
| **Files** | `apps/web/src/lib/stores/calorie.ts` (line 86), new migration |
| **Impact** | Current: new target mode, no effect on existing. Future: enables gradual calorie ramp-up. |
| **Risk** | Low. New code path, existing paths untouched. |
| **Depends on** | #37e |

---

### #37c -- Calorie bank redesign

| | |
|---|---|
| **Root cause** | `calorieBank()` (calorie.ts:111) is disabled, returns `0`. `TrendsTab.svelte` still calls it conditionally. |
| **Solution** | Implement: read day-by-day actuals from localStorage, compute daily surplus/deficit vs target, rolling window average over `bank_window` days (per-phase), clamp by `bank_clamp_lo`/`bank_clamp_hi`, bound to current phase only. |
| **Files** | `apps/web/src/lib/stores/calorie.ts` (line 111) |
| **Impact** | Current: enables calorie banking for maintenance/recomposition phases. Future: needs phase boundaries (#52). |
| **Risk** | Medium. Complex calculation, needs thorough testing. |
| **Depends on** | #37e, arguably #52 |

---

## Execution Order

```
Batch 1 (data integrity):  #56 → #52
Batch 2 (core UX):         #47 → #49 → #48 (verify) → #53
Batch 3 (features):        #57 → #54 → #55 (needs input)
Batch 4 (engine + polish): #50 → #51 → #37e → #37b → #37c
```

Deploy after Batch 2. Batches 3-4 can go in a second deploy.
