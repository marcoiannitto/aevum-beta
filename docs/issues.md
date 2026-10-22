# AEVUM Tracker V3 -- Issue Tracker

> Branch: `feat/monorepo-restructure`
> Last updated: 2026-10-22

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
| #26 | Program selector                       | DONE   |         | Migration 0018/0019, backend routes, stores, ProgramPicker UI |
| #26a| Admin phases: program_id column        | DONE   | 0d601c3 | Added program_id column, reordered all columns into logical groups |
| #26b| Admin user detail: program dropdown    | DONE   | 0d601c3 | Added select dropdown bound to programs store, saves via admin_update_user |

## In progress

| #    | Title                          | Status      | Notes |
|------|--------------------------------|-------------|-------|
| #26c | Programs dropdown only shows AEVUM | OPEN    | loadPrograms() refactored to fetch API first, cache as fallback only. Awaited in admin and ProgramPicker. Pushed in v3.1.6 but not yet confirmed working. May need further debugging (API response, auth, or rendering timing). |
| #26d | ProgramPicker empty on mobile  | OPEN        | Bottom sheet opens but shows no program cards. Same root cause as #26c. Needs testing after #26c is confirmed. |
| #44  | Meal expand: ingredients breakdown missing | OPEN | Clicking a logged meal should expand to show each ingredient with its individual kcal, protein, fat, carbs. These should add up to the meal total. Was working before, now broken. |
| #37e | Calorie engine tests           | OPEN        | Write tests before building #37b/c |
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
