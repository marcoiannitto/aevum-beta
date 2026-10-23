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
| #26c| Programs dropdown only shows AEVUM     | DONE   | b0469e6 | Root cause: loadPrograms used user token (null in admin). Fix: programs endpoint made unauthenticated (public config). |
| #26d| ProgramPicker empty on mobile          | DONE   | b0469e6 | Same root cause as #26c. Fixed by noAuth flag on store. |
| #45 | loadPrograms 400 on deployed app       | DONE   | b0469e6 | Deployed API didn't have programs route. Same commit fixes it; needs redeploy. |
| #44 | Meal expand: ingredients breakdown missing | DONE |         | Was broken, now fixed |

## In progress

| #    | Title                          | Status      | Notes |
|------|--------------------------------|-------------|-------|
| #47  | ProgramPicker popup renders below profile sheet | OPEN | Popup opens behind/below the profile window instead of on top. UX bug, needs root cause analysis. |
| #46  | AI worker 401 on quickEstimate | DONE | Expired Anthropic API key. Updated `ANTHROPIC_KEY` secret in Cloudflare worker settings. |
| #48  | Meal time edit after logging   | OPEN | After adding a meal, user needs to be able to change the timing. Currently no edit UI for meal time. |
| #49  | Meal add UI: match V2 style    | OPEN | V3 "add a meal" UI doesn't match V2. Replicate V2 meal logging UI exactly. |
| #52  | Phase change is retroactive     | OPEN | Changing phase_mode retroactively changes all past days. Phase should be stamped into day_json at save time so historical data is immutable. Backfill needed for existing data. |
| #53  | Signup: activity labels wrong  | OPEN | Registration form uses vague labels (Sedentary, Moderately Active, etc). Should use frequency-based labels (workouts per week) like the tracker does (#31). |
| #54  | Free tier: show locked program selector | OPEN | Free tier signup doesn't show program selection. Should display it as locked/greyed out (available only for paid tiers) so users know it exists. |
| #55  | Program logic: define and verify | OPEN | Program flow logic needs proper definition and verification that implementation matches. Scope TBD. |
| #56  | Profile: sex and activity not showing after signup | OPEN | Free tier signup saves sex and activity but profile sheet shows them empty. Likely duplicate variable names (e.g. sex vs gender, activity vs act). Audit all user fields for duplicates and ensure signup → profile → DB uses one variable per parameter. |
| #50  | Admin sidebar: make sticky     | OPEN | Sidebar scrolls with page. Should be fixed/static (position: sticky or fixed). |
| #51  | Admin sidebar: reorder menu    | OPEN | New order: People, Intakes, then reference tables (Phases, Rules, Foods, then rest unchanged). |
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
