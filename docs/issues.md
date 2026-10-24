# AEVUM Tracker V3 -- Issue Tracker

> Branch: `feat/monorepo-restructure`
> Last updated: 2026-10-24

## Status legend

- **DONE** -- fixed and pushed
- **CLOSED** -- no action needed (already implemented or resolved by other fix)
- **DEFERRED** -- postponed to post-rollout
- **OPEN** -- not yet started
- **NEEDS INPUT** -- blocked on design/decision from Marco

---

## Resolved

| #   | Title                                  | Status | Commit  | Notes |
|-----|----------------------------------------|--------|---------|-------|
| P0  | Page doesn't load (pid not defined)    | DONE   | 430cf1f | Missing imports in calorie.ts |
| #17 | Camera vs gallery on mobile            | DONE   | 44564b5 | Two buttons + two hidden inputs matching V2 |
| #25 | Alcohol calories overridden by Atwater | DONE   | 44564b5 | Added alcohol_g (7 kcal/g) to Atwater guard + updated AI prompt |
| #36 | phase_mode not in admin allowed fields | DONE   | 44564b5 | Added to adminUpdateUser allowed list |
| #37a| tdee_mult target mode                  | DONE   | 44564b5 | effectiveTarget() handles tdee_mult with calorie_cut ?? 1 |
| #11 | Retry queue for failed syncs           | CLOSED |         | Already implemented in day.ts (exponential backoff) |
| #22 | Duplicate sync calls                   | CLOSED |         | Resolved by prior #16 fix |
| #14 | Stale data after reconnect             | CLOSED |         | Symptom of #10 + #11, both addressed |
| #32 | Calorie display NaN                    | DONE   | 02c6998 | |
| #33 | Target shows profile kcal not computed  | DONE   | 02c6998 | |
| #34 | Rolling weight reads wrong keys        | DONE   | 02c6998 | |
| #35 | CalorieStatus not reactive             | DONE   | ed11912 | |
| #30 | Rolling weight TDEE                    | DONE   | 9d9c92b | |
| #31 | Frequency-based activity labels        | DONE   | 9d9c92b | |
| #23 | Activity label resolution              | DONE   | ea099d3 | |
| #27 | Age from DOB                           | DONE   | ea099d3 | |
| #28 | Reactivity fixes                       | DONE   | ea099d3 | |
| #29 | Calorie simplification                 | DONE   | 7e0a44b | Stripped to liveTDEE only |
| #41 | Trends stat row: V2 hero card          | DONE   | c270ef7 | Single hero card + colored chips, matching V2 pattern |
| #42 | Date-first header rewrite              | DONE   | 9fa399c | Phone date is source of truth, day number from start_date |
| #43 | Meal ingredient expand broken          | DONE   |         | MealLogSheet was dropping `items` from AI response |
| #26 | Program selector                       | DONE   | 32607d7 | Migration 0018/0019, backend routes, stores, ProgramPicker UI. Validated via code review. |
| #26a| Admin phases: program_id column        | DONE   | 0d601c3 | Added program_id column, reordered all columns into logical groups |
| #26b| Admin user detail: program dropdown    | DONE   | 0d601c3 | Added select dropdown bound to programs store, saves via admin_update_user |
| #26c| Programs dropdown only shows AEVUM     | DONE   | b0469e6 | Root cause: loadPrograms used user token (null in admin). Fix: programs endpoint made unauthenticated (public config). |
| #26d| ProgramPicker empty on mobile          | DONE   | b0469e6 | Same root cause as #26c. Fixed by noAuth flag on store. |
| #45 | loadPrograms 400 on deployed app       | DONE   | b0469e6 | Deployed API didn't have programs route. Same commit fixes it; needs redeploy. |
| #44 | Meal expand: ingredients breakdown missing | DONE |         | Was broken, now fixed |
| #46 | AI worker 401 on quickEstimate | DONE   |         | Expired Anthropic API key. Updated `ANTHROPIC_KEY` secret in Cloudflare worker settings. |
| #47 | ProgramPicker popup renders below profile sheet | DONE |  | z-index raised from 900/901 to 1000/1001 in Sheet.svelte |
| #48 | Meal time edit after logging   | CLOSED |         | Already implemented in Timeline.svelte (tap time to edit) |
| #49 | Meal add UI: match V2 style    | DONE   |         | MealLogSheet rewritten: 3 tabs (Describe/Ingredients/Photo), macro grid with phase-aware max labels, traffic light compliance flags |
| #50 | Admin sidebar: make sticky     | CLOSED |         | Already has position:sticky + top:0 + height:100vh in AdminSidebar.svelte |
| #52 | Phase change is retroactive    | DONE   | 32607d7 | Phase stamped immutably in day_json on first save. program_id also stamped. Validated via code review. |
| #53 | Signup: activity labels wrong  | DONE   |         | D1 config row fix in d1-pending-sql.sql |
| #54 | Free tier: show locked program selector | DONE | | Locked program cards on free signup form (greyed out, with program color accent) |
| #55 | Program switch resets day count | DONE   | 32607d7 | Backend sets program_start_date on switch. Date-keyed storage prevents historical data collision. Validated via code review. |
| #56 | Profile: sex and activity not showing | DONE | | Register response includes sex/act, admin column mapping fixed, login fallback profile save |
| #57 | Program-aware statistics        | DONE   | 32607d7 | Trends filter changed from phase to program. Dropdown lists all programs, filters by program_id in day_json. Validated via code review. |
| #57a| Trends program filter selects wrong data | DONE | 6a7b23f | Root cause: legacy day_json rows had no `program_id`, fallback `\|\| 'aevum'` lumped all old days under AEVUM. Fix: D1 backfill (program_id stamped per phase→program mapping), lowercase normalization of phase column, admin phase column fix (`log.phase ?? phaseForDay()`). Needs deploy to verify admin fix. |
| #58 | Phase column shows "Aevum" instead of actual phase | DONE | 8471524 | Validated via code review. |

## In progress

| #    | Title                          | Status      | Notes |
|------|--------------------------------|-------------|-------|
| #51  | Admin sidebar: reorder menu    | NEEDS INPUT | Deferred — Marco will decide order later. |
| #37e | Calorie engine tests           | OPEN        | Write tests before building #37b/c. Shared calorie functions already tested. Frontend calorie store functions need mocking (localStorage, Svelte stores). |
| #37b | ramp_then_hold target mode     | OPEN        | Depends on #37e |
| #37c | Calorie bank redesign          | OPEN        | Depends on #37e |
| #59  | AI worker sporadic 403         | OPEN        | Anthropic API rate-limits cause sporadic "ai http 403". Fix: add 1-retry with 1s backoff in `callAI` for 403/429 responses. |
| #60  | Admin: add/edit programs        | DONE        | AdminPrograms list + AdminProgramDetail drill-down. Create/toggle/edit programs. |
| #61  | Admin: edit phase config        | DONE        | AdminPhaseEditor modal with grouped fieldsets (identity, duration, calorie strategy, bank config, weight goal, rules, display). Key locked on existing phases. |
| #62  | Food tab AI broken              | OPEN        | Macros estimate returns nothing, food check returns "error / Could not check. Try again." Likely related to #59 (sporadic 403) or a different API/routing issue. Needs investigation. |
| #63  | Remove exercise from Today tab  | OPEN        | Exercise section in "Today" is redundant, already covered in Check-in. Remove it from DayView. |
| #64  | Trends: 0% on target wrong      | OPEN        | Compliance calc uses fallback thresholds when rules don't load. Loading phase has calorie_mode 'hidden' so target may be wrong/zero. |
| #65  | Trends: loading bars should not be colored | OPEN | Loading has no calorie limit, bars should be neutral (not red). Depends on #37. |
| #66  | Trends: over-budget bars not red | OPEN        | Bars exceeding daily budget aren't flagged red. Thresholds fall back to defaults when rules don't load. Depends on #37. |
| #67  | Trends: bars ignore phase rules for coloring | OPEN | Bars should use green/amber/red bands from `ruleFor()` per phase. `bandClass()` exists but isn't used by CalorieBars. Depends on #37. |
| #68  | Admin: phase parameter tuning UI | OPEN | See spec below. Quick-edit phase params (calorie_cut, bank_window, clamps, tolerance) without opening the full phase editor. |
| #69  | Admin: client calorie dashboard | OPEN | See spec below. Per-user read-only view: TDEE, program, phase, base target, bank adjustment, effective target, weekly verdict. |

---

### #68 Admin: phase parameter tuning UI

**Problem:** To adjust calorie strategy (e.g. change calorie_cut from 0.85 to 0.90, or widen bank_window), Marco must open Programs > drill into program > click phase > scroll through full editor. Too many clicks for a common operation.

**Solution:** Add a "Calorie Tuning" section to admin sidebar (under Programs). Single-page view:

| Column | Source |
|---|---|
| Phase key | phases.key |
| Program | phases.program_id |
| Mode | phases.target_mode |
| Cut | phases.calorie_cut |
| Bank | phases.calorie_bank (toggle) |
| Window | phases.bank_window |
| Clamp lo / hi | phases.bank_clamp_lo / bank_clamp_hi |
| Grace days | phases.bank_grace_days |
| Tolerance | phases.weekly_tolerance |

All cells inline-editable. Save button per row. No modal, no drill-down.

**API:** Reuses existing `admin_phase_save`. No new endpoints.

**Effort:** Small (one new component, no backend).

---

### #69 Admin: client calorie dashboard

**Problem:** Marco cannot see what the calorie engine is computing for each user. Bank state, effective target, and weekly verdict are client-side derived values with no admin visibility.

**Solution:** New admin view "Client Calories" (sidebar section under Users). Table of all active users showing live engine state:

| Column | Source |
|---|---|
| User | users.name |
| Program | day_json.program_id (latest log) |
| Phase | day_json.phase (latest log) |
| TDEE | Computed from rolling weight (last 7 logs with weight) |
| Base target | From phase config + TDEE |
| Bank adj | computeBank() from shared package, using last N days of logs |
| Effective target | base + bank, clamped |
| Weekly verdict | weeklyVerdict() from shared package |
| Last log date | latest daily_log date |

**Implementation approach:**
1. New API endpoint `admin_client_calories` that:
   - Fetches all active users
   - For each user: last 14 daily_logs (covers bank_window + verdict), latest profile (for TDEE inputs)
   - Runs shared pure functions server-side (computeBank, clampTarget, weeklyVerdict)
   - Returns pre-computed rows
2. New `AdminClientCalories.svelte` component: read-only table, refresh button, click user to drill into UserDetail
3. Optional: click a user row to expand and see day-by-day breakdown (date, intake, base target, bank delta)

**Why server-side:** Bank is currently client-only (localStorage). For admin visibility, compute from D1 data using the same shared functions. This also validates that client and server agree.

**Dependencies:** Steps 6-8 should be done first (ramp_then_hold, verdict, bank UI), so the engine is feature-complete before building a monitoring dashboard for it.

**Effort:** Medium (new API endpoint with multi-user query + shared function calls, one new component).

---

## Deferred (post-rollout)

| #    | Title                          | Why deferred |
|------|--------------------------------|-------------|
| #37d | Drift detection + popup        | High complexity, needs UX design |
| #10  | Backend hydration race         | Needs careful sync protocol redesign |
| #12  | Admin seed deletes all data    | Low risk (admin-only), needs migration approach |

## Needs input

(none)

---

## Validation checklist (post-deploy)

Pull `feat/monorepo-restructure` and run `deploy.ps1`, then test:

| # | Fix | Test | Expected |
|---|-----|------|----------|
| #57a | Admin phase column fix | Open admin → user detail, check Phase column for past days | Phase shows stored value (loading/maintenance/recomposition), not retroactively computed |
| DB | Date-keyed sync | Log a day, force sync (refresh or toggle connection). Check D1: `SELECT user_id, date, day FROM daily_logs ORDER BY date DESC LIMIT 5` | No duplicate rows for same date. Migration v3.1.7-date-key already run. |

---

## Other notes

- AI worker source saved at `ai-worker/src/index.js` (v1.13.0, with #25 fix)
- Deploy only from local machine (cloud container blocked from Cloudflare API)
- V3 calorie engine: baseTarget() + bankAdjustment() + effectiveTarget(). Supports `fixed` and `tdee_mult` modes. Bank logic in `packages/shared/src/calorie-bank.ts` (29 tests).
- Bank adjustment active when phase has calorie_bank=1. Asymmetric: overspend 1:1, underspend capped 200 kcal/day. Safety clamps: floor 60% TDEE, ceiling 130% base target.
- Current APP_VERSION: v3.1.6
- Programs table has 4 rows (aevum, maintenance, recomposition, keto), all is_active=1 (confirmed via D1)
- Migration 0019 fixed 0018's duplicate phase issue (deleted _main variants, assigned program_id to existing phases)
- Shallow clone stop hook falsely reports unpushed commits. Fix each time: `git update-ref refs/remotes/origin/feat/monorepo-restructure HEAD`
- **DB harmonization (2026-10-23):** Backfilled `program_id` in `day_json` for all legacy rows using phase→program mapping from `phases` table. Normalized all `phase` values to lowercase. Marco's Oct 9–18 manually corrected to maintenance. Admin UserDetail.svelte phase column now reads stored `log.phase` with fallback to computed (commit 6a7b23f).
- **Bug to investigate:** Marco's Oct 9–18 data kept reverting to recomposition despite manual DB fixes. Root cause unknown — may be a sync/hydration issue writing stale localStorage back to D1.
