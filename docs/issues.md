# AEVUM Tracker V3 -- Issue Tracker

> Branch: `feat/monorepo-restructure`
> Last updated: 2026-10-23

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
| #26 | Program selector                       | REOPENED |       | Migration 0018/0019, backend routes, stores, ProgramPicker UI. Reopened: switching to maintenance triggers "loading" phase instead of maintenance. |
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
| #52 | Phase change is retroactive    | REOPENED |       | Phase stamped immutably in day_json on first save. Reopened: program switch to maintenance created new day 1 at top of list, upsetting historical data. Trends track by "day" instead of "date", needs to use date. |
| #53 | Signup: activity labels wrong  | DONE   |         | D1 config row fix in d1-pending-sql.sql |
| #54 | Free tier: show locked program selector | DONE | | Locked program cards on free signup form (greyed out, with program color accent) |
| #55 | Program switch resets day count | REOPENED |       | Backend resets start_date to today on program switch. Reopened: reset works but disrupts historical data ordering. Needs investigation. |
| #56 | Profile: sex and activity not showing | DONE | | Register response includes sex/act, admin column mapping fixed, login fallback profile save |
| #57 | Program-aware statistics        | REOPENED |       | Currently phase-aware only. Needs to be program-aware (filter by program, not just phase). Further development needed. |
| #58 | Phase column shows "Aevum" instead of actual phase | DONE | 8471524 | Root cause: migration 0018 left is_program=0 on AEVUM sub-phases, so phasesList was always empty and 0-phase branch returned program ID. Fix: phasesLoaded guard, 0-phase branch guard, re-stamp invalid phases, DB is_program=1, historical data SQL fix. |

## In progress

| #    | Title                          | Status      | Notes |
|------|--------------------------------|-------------|-------|
| #26  | Program switch shows wrong phase | OPEN      | Switching to maintenance triggers "loading" instead of maintenance. Phase logic doesn't account for 0-phase programs on switch. |
| #52  | Program switch disrupts history | OPEN       | New day 1 inserted at top of list. Trends use "day" column instead of "date". Need date-based ordering throughout. |
| #55  | Program switch upsets data ordering | OPEN    | Day count reset works but breaks historical continuity. Related to #52. |
| #57  | Program-aware statistics        | OPEN       | Filter by program, not just phase. Needs further development. |
| #51  | Admin sidebar: reorder menu    | NEEDS INPUT | Deferred — Marco will decide order later. |
| #37e | Calorie engine tests           | OPEN        | Write tests before building #37b/c. Shared calorie functions already tested. Frontend calorie store functions need mocking (localStorage, Svelte stores). |
| #37b | ramp_then_hold target mode     | OPEN        | Depends on #37e |
| #37c | Calorie bank redesign          | OPEN        | Depends on #37e |

## Deferred (post-rollout)

| #    | Title                          | Why deferred |
|------|--------------------------------|-------------|
| #37d | Drift detection + popup        | High complexity, needs UX design |
| #10  | Backend hydration race         | Needs careful sync protocol redesign |
| #12  | Admin seed deletes all data    | Low risk (admin-only), needs migration approach |

## Needs input

(none)

---

## Other notes

- AI worker source saved at `ai-worker/src/index.js` (v1.13.0, with #25 fix)
- Deploy only from local machine (cloud container blocked from Cloudflare API)
- V3 calorie engine simplified: effectiveTarget() supports `fixed` and `tdee_mult` modes, everything else falls back to liveTDEE
- calorieBank() returns 0 (disabled until #37c)
- Current APP_VERSION: v3.1.6
- Programs table has 4 rows (aevum, maintenance, recomposition, keto), all is_active=1 (confirmed via D1)
- Migration 0019 fixed 0018's duplicate phase issue (deleted _main variants, assigned program_id to existing phases)
- Shallow clone stop hook falsely reports unpushed commits. Fix each time: `git update-ref refs/remotes/origin/feat/monorepo-restructure HEAD`
