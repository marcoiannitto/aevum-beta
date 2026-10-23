# AEVUM Tracker V3 — Codebase Health Audit

> Date: 2026-10-22
> Scope: Full codebase — field names, data flow, redundancy, type safety, logic bugs
> Status: **REPORT ONLY — no fixes applied**

---

## CRITICAL — Data corruption / wrong values

### C1. Sex field: uppercase on signup, lowercase everywhere else

| Layer | Value sent/stored |
|-------|------------------|
| Signup form (login/+page.svelte:17) | `'M'` / `'F'` (uppercase) |
| `doRegister()` API (index.js:266) | `String(body.sex).toLowerCase()` → `'m'`/`'f'` ✓ |
| DB schema (users.sex) | `CHECK(sex IN ('m','f'))` — lowercase only |
| `getProfile()` API (index.js:459) | Returns `row.sex` → `'m'`/`'f'` |
| `UserProfile.sex` (auth.ts:38) | Typed as `string` (loose) |
| `mifflin()` (calorie.ts:29) | Casts `(p.sex \|\| 'm').toLowerCase() as 'm' \| 'f'` |
| `Profile.sex` (shared/types.ts:12) | Typed as `'m' \| 'f'` (strict) |

**Verdict:** Works by accident — `doRegister()` lowercases. But if the frontend ever sends directly (e.g. completeProfile for Google users), the `M`/`F` values go through the same lowercasing at line 378. Safe for now but fragile — a single new endpoint that skips `.toLowerCase()` breaks it.

**Fix:** Normalize in signup form (`freeSex = 'm'`), and add a guard in `UserProfile` type.

---

### C2. Activity: three different representations, mismatched label sets

| Where | Format | Labels |
|-------|--------|--------|
| Signup form (login/+page.svelte:309) | String label | `sedentary`, `light`, `moderate`, `active`, `extra` |
| API `resolveActivity()` (index.js:229) | Maps label→factor | Labels from DB config, fallback: `sedentary`, `light`, `moderate`, `active`, `extra` |
| DB column `users.activity` | **REAL (numeric factor)** | `1.2`, `1.375`, `1.55`, `1.725`, `1.9` |
| `getProfile()` API (index.js:467) | Returns `act: row.activity` | **Numeric** (e.g. `1.55`) |
| `UserProfile.act` (auth.ts:43) | Typed as `string` | Could be `"1.55"` or `"moderate"` |
| Config DEFAULTS `act_labels` (config.ts:26) | Frequency labels | `No exercise`, `1-3 days/week`, `3-5 days/week`, `6-7 days/week`, `Athlete / physical job + training` |

**Root cause of #53 and #56:**
1. Signup sends `"moderate"` → API resolves to `1.55` → DB stores `1.55`
2. Profile loads → `act: "1.55"` (numeric string)
3. ProfilePanel tries `activityLabel("1.55")` → looks in config labels (`"No exercise"`, `"1-3 days/week"`, etc.) → no string match → falls to numeric match → finds closest factor → shows `"3-5 days/week"`

This actually works correctly for display! But the **signup labels** ("Sedentary", "Moderately Active") don't match the **config labels** ("No exercise", "1-3 days/week"). That's issue #53.

**The real #56 bug — sex not showing:** `getProfile()` returns `sex: row.sex || ''`. If sex is `'m'` or `'f'`, that's truthy. The ProfilePanel shows `{$profile.sex || '—'}`. This should display. Let me verify...

Actually — `$profile.sex` shows as empty when: the **Google auth** path creates a user WITHOUT sex (line 346-348: `INSERT INTO users (id, name, email, program)`). Then `getProfile()` returns `sex: row.sex || '' = ''`. That's the bug for Google-auth users who haven't completed their profile yet. But `completeProfile` sets it. So #56 happens in the window between Google auth and profile completion, OR if `completeProfile` was never called.

**Fix:** Ensure Google auth flow ALWAYS calls `completeProfile` before showing the app.

---

### C3. `adminUpdateUser` — `act` field maps to wrong DB column

```
allowed = [..., 'act', ...]  // line 1292
sets.push(`${key} = ?`)      // line 1306 → generates "act = ?" 
```

But the DB column is `activity`, not `act`. This generates `UPDATE users SET act = ? WHERE id = ?` which SQLite will reject with "no such column: act".

**Impact:** Admin cannot update a user's activity level through the admin panel. Currently mitigated because the admin UI doesn't have an activity input field.

**Fix:** Map `'act'` → `'activity'` in `adminUpdateUser`, and run through `resolveActivity()`.

---

### C4. `adminUpdateUser` — `sex` not lowercased

Line 1305: `body[key]` is stored directly. No `.toLowerCase()`. If admin sends `'M'`, the DB CHECK constraint `sex IN ('m','f')` will reject it.

**Fix:** Add the same lowercase normalization as `doRegister()`.

---

## HIGH — Logic bugs / wrong behavior

### H1. Phase is not stamped into day data (#52)

`DayData` interface (day.ts:98-111) has no `phase` field. Phase is computed live via `phaseFor(dayNum, profile)` every time. When `phase_mode` changes, ALL historical days retroactively change phase.

`syncDay()` (day.ts:228) computes phase on sync: `phase: phaseFor(num, get(profile)).key` — but this goes to the API's `daily_logs.phase` column only. The local `DayData` in localStorage doesn't store it.

**Impact:** Changing from maintenance to recomposition makes all post-stabilization days show as recomposition, even days that were genuinely in maintenance.

**Fix:** Stamp `phase` into `DayData` at save time. Backfill existing data using `daily_logs.phase` from DB.

---

### H2. `calorie_mode` vs `target_mode` — both exist, different purposes

| Field | Where defined | Purpose |
|-------|---------------|---------|
| `calorie_mode` | phases.calorie_mode | **UI display**: `'bar'` (show calorie bar), `'protocol'` (show protocol), `'hidden'` |
| `target_mode` | phases.target_mode | **Calculation**: `'fixed'`, `'tdee_mult'`, `'ramp_then_hold'`, `'none'` |

**Verdict:** NOT redundant. They control different things. But naming is confusing — `calorie_mode` sounds like it should control calorie calculation.

**Fix:** No code change needed. Add comment/docs clarifying the distinction.

---

### H3. `updateProfile` TDEE recalculation uses `target_kg` as weight

Line 442-443 of index.js:
```js
const tw = parseFloat(row.target_kg) || parseFloat(row.start_weight);
const tdee = Math.round((10 * tw + 6.25 * row.height - 5 * age + s) * act);
```

TDEE is calculated using `target_kg` (goal weight) instead of actual/start weight. This means if someone sets target_kg = 60 but weighs 90, their TDEE is computed as if they weigh 60. Mifflin-St Jeor should use **current** weight.

**Impact:** TDEE stored in `current_target_kcal` is wrong for anyone with `target_kg` set. Could be 300-500 kcal off.

**Fix:** Use `row.start_weight` (or rolling average) instead of `target_kg`.

---

### H4. Google auth: profile completion not enforced

`authGoogle()` creates user with just `(id, name, email, program)` — no sex, dob, height, weight, activity. Returns `needs_profile: true`.

Frontend (login/+page.svelte:105-110):
```js
if (d.needs_profile) {
    isProgram.set(false);
    view = 'free';  // Shows registration form
    loading = false;
    return;
}
```

But `handleFreeRegister()` calls `api('register', ...)` which creates a NEW user via `doRegister()` instead of completing the existing one. The Google-created user row stays incomplete.

**Impact:** Google auth users who fill the form end up with TWO user rows — one from Google auth (incomplete), one from register (complete but unlinked to Google). Their token points to the Google user (incomplete), but the app saves a local profile from the register call.

**Fix:** Change the Google flow to call `complete_profile` instead of `register`.

---

## MEDIUM — Inconsistencies / fragility

### M1. Field name mapping: `weight` vs `start_weight`

| Layer | Field name | Contains |
|-------|-----------|----------|
| DB column | `start_weight` | Initial weight at signup |
| `getProfile()` API | `weight: row.start_weight` AND `start_weight: row.start_weight` | Same value, two names |
| `UserProfile` (auth.ts) | `weight: number` | Start weight |
| `Profile` (shared/types.ts) | `start_weight: number` | Start weight |
| `DayData.weight` (day.ts) | `weight: string` | Daily weigh-in (different meaning!) |

**Impact:** `UserProfile.weight` and `DayData.weight` mean different things. `calorie.ts` uses `p.weight` (start weight) while `rollingWeight()` reads daily `dd.weight` from localStorage. Works correctly but confusing.

**Fix:** Rename `UserProfile.weight` to `start_weight` to match shared type and DB.

---

### M2. Config DEFAULTS duplicate phase registry values

| Config key | Default value | Also in | 
|-----------|--------------|---------|
| `bank_window` | 4 | `phases.bank_window` |
| `bank_clamp_lo` | 0.85 | `phases.bank_clamp_lo` |
| `bank_clamp_hi` | 1.15 | `phases.bank_clamp_hi` |
| `drift_review_days` | 7 | `phases.drift_review_days` |

**Impact:** Phase registry values should be the source of truth per-phase. Config DEFAULTS are fallbacks. Currently `calorie.ts` reads from config (`cfg('drift_review_days')`) not from phase registry. This means all phases share the same value.

**Fix:** `calorie.ts` should read from `phReg(phase).drift_review_days ?? cfg('drift_review_days')`.

---

### M3. `mifflin()` in calorie.ts defaults sex to `'m'` when empty

Line 29: `(p.sex || 'm').toLowerCase()`. If sex is empty string (Google auth incomplete profile), defaults to male. The Mifflin-St Jeor difference between male (+5) and female (-161) is ~166 kcal.

**Fix:** Guard against empty sex; return 0 or throw if sex not set.

---

### M4. Signup `freeAct` options don't match API fallback labels

| Signup form options | API ACT_DEFAULTS labels | Config DEFAULTS act_labels |
|-------------------|----------------------|--------------------------|
| `sedentary` | `sedentary` | `No exercise` |
| `light` | `light` | `1-3 days/week` |
| `moderate` | `moderate` | `3-5 days/week` |
| `active` | `active` | `6-7 days/week` |
| `extra` | `extra` | `Athlete / physical job + training` |

The API `resolveActivity()` uses `ACT_DEFAULTS.labels` as fallback, which matches signup. But config DEFAULTS has the frequency-based labels. If the config DB rows are set (they likely are), the API resolveActivity reads from DB, which has frequency labels. Then `"moderate"` from signup won't match `"3-5 days/week"` from DB config → defaults to index 2 → still gets factor `1.55`.

**Verdict:** Works by coincidence (same index position). But brittle.

**Fix:** Signup should use the same labels as config (frequency-based), per issue #53.

---

### M5. `UserProfile` has `[key: string]: unknown` index signature

Line 63 of auth.ts: `[key: string]: unknown` — destroys type safety. Any property access compiles without error.

**Fix:** Remove the index signature; list all known fields explicitly.

---

### M6. Hono API (apps/api) exists but most routes go through v2-api

Two API codebases:
- `v2-api/src/index.js` — main API handling register, login, sync, admin, profile, etc.
- `apps/api/src/` — Hono-based API with DB schema, admin routes

`apps/api/src/routes/admin.ts` has an `adminUpdateUser` too. Need to verify which one is actually deployed.

**Impact:** Potential confusion about which API is live. Changes to the wrong one have no effect.

---

## LOW — Code quality / cleanup

### L1. `calorie_mode` field unused in frontend logic

`calorie_mode` exists on `PhaseConfig` (phases.ts:34) and is sent to admin grid (admin.ts:186), but no frontend logic branches on it. The calorie bar is always shown based on `target_mode`.

### L2. `calorieBank()` is a dead stub

Returns `0` always (calorie.ts:111-113). Kept as export to prevent breakage. Will be replaced by #37c.

### L3. `DayData.weight` is string type

Should be `number | null`. Currently parsed with `parseFloat()` everywhere it's read.

### L4. `need` field on `UserProfile` (auth.ts:44)

Defined but never written or read. Likely vestigial from V2.

### L5. Shared `PhaseRow.name` typed as `PhaseKey` but is actually the phase key

The field is named `name` but holds the key (`'loading'`, `'activation'`, etc.). The actual display name is `label`. Confusing naming.

### L6. No `program_id` on `UserProfile` type (inconsistent)

`UserProfile` has `program_id?: string` (auth.ts:61) but the API `getProfile()` doesn't return it. It comes from a different endpoint.

---

## Fix priority (recommended order)

| Priority | Issue | Risk | Effort |
|----------|-------|------|--------|
| 1 | **H4** — Google auth creates double users | Data corruption | Medium |
| 2 | **H3** — TDEE uses target_kg not actual weight | Wrong calories | Small |
| 3 | **C3** — Admin `act` → wrong column name | Admin broken | Small |
| 4 | **C4** — Admin `sex` not lowercased | Admin broken | Tiny |
| 5 | **C1** — Normalize sex in signup | Fragility | Tiny |
| 6 | **M1** — Rename `weight` → `start_weight` | Clarity | Medium |
| 7 | **H1** — Stamp phase into DayData (#52) | Retroactive bug | Large |
| 8 | **M3** — Guard empty sex in mifflin | Wrong TDEE | Tiny |
| 9 | **M4/#53** — Signup activity labels | UX mismatch | Small |
| 10 | **M2** — Config vs phase registry values | Wrong per-phase | Small |
| 11 | **M5** — Remove index signature | Type safety | Small |
| 12 | **L1-L6** — Cleanup | Code quality | Small each |

---

## Files touched per fix

| Fix | Files |
|-----|-------|
| H4 | `login/+page.svelte` |
| H3 | `v2-api/src/index.js` (updateProfile) |
| C3 | `v2-api/src/index.js` (adminUpdateUser) |
| C4 | `v2-api/src/index.js` (adminUpdateUser) |
| C1 | `login/+page.svelte` |
| M1 | `auth.ts`, `calorie.ts`, `ProfilePanel.svelte`, any consumer of `profile.weight` |
| H1 | `day.ts`, `shared/types.ts`, hydration logic |
| M3 | `calorie.ts` |
| M4 | `login/+page.svelte`, `config.ts` |
| M2 | `calorie.ts` |
| M5 | `auth.ts` |
