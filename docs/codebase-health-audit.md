# AEVUM Tracker V3 — Codebase Health Audit

> Date: 2026-10-22
> Scope: Full stack — signup → profile → stores → API → DB
> Status: **Analysis only — no fixes applied**

---

## Severity Legend

| Level | Meaning |
|-------|---------|
| 🔴 CRITICAL | Data loss, silent failure, wrong calculations |
| 🟠 HIGH | Broken feature, data not saved/shown correctly |
| 🟡 MEDIUM | Inconsistency, tech debt, maintenance risk |
| 🟢 LOW | Style, minor redundancy, nice-to-fix |

---

## 1. Field Name Mismatches (act / activity / weight / start_weight)

### 🔴 A1. `act` vs `activity` — split identity across the stack

The same parameter (activity multiplier) uses two different names depending on where you look:

| Layer | Field name | Value stored |
|-------|-----------|-------------|
| **DB column** | `activity` | numeric factor (e.g. 1.55) |
| **Signup form** | `freeAct` → sends `act` | string label ("moderate") |
| **API `doRegister()`** | receives `act` → resolves → writes `activity` column | numeric factor |
| **API `completeProfile()`** | receives `act` → resolves → writes `activity` column | numeric factor |
| **API `updateProfile()`** | allowed list has `act` → resolves → writes `activity` column | numeric factor |
| **API `adminUpdateUser()`** | allowed list has `act` → writes `act` column directly ❌ | **BUG**: writes string to `activity` without resolving |
| **API `getProfile()`** | reads `row.activity` → returns as `act` | numeric factor (or string if admin wrote it) |
| **Frontend `UserProfile`** | `act: string` | string or numeric, depends on source |
| **Frontend `calorie.ts`** | `resolveActivityFactor(p.act)` | handles both string and numeric |
| **`@aevum/shared` Profile type** | `activity: number` | numeric only |

**Bug**: `adminUpdateUser()` has `act` in the allowed list but does NOT call `resolveActivity()`. It writes the raw value directly to the DB column `act`. But the DB column is called `activity`, so `SET act = ?` would fail silently or create a new column depending on SQLite strict mode. Actually — re-reading the code at line 1304-1307, the loop does `sets.push(\`${key} = ?\`)` using the key name `act`, which means it generates `SET act = ?`. The DB column is `activity`. **This SQL would fail** because there is no `act` column in the `users` table.

**Impact**: Admin cannot update a user's activity level. The SQL would either error or do nothing.

### 🟠 A2. `weight` vs `start_weight` — ambiguous naming

| Layer | Field name | Meaning |
|-------|-----------|---------|
| **DB column** | `start_weight` | Initial weight at registration |
| **Signup form** | sends `weight` | Body weight at signup |
| **API `doRegister()`** | `body.weight` → writes `start_weight` column | ✅ correct mapping |
| **API `getProfile()`** | returns both `start_weight: row.start_weight` AND `weight: row.start_weight` | ✅ aliases for compat |
| **Frontend `UserProfile`** | `weight: number` | Used everywhere for "start weight" |
| **Frontend `calorie.ts`** | `p.weight` for Mifflin base, `rollingWeight()` for daily | ✅ works |
| **Frontend `ProfilePanel`** | displays `$profile.weight` as "Start weight" | ✅ correct display |
| **`@aevum/shared` Profile** | `start_weight: number` | No `weight` alias |

**Risk**: The dual naming (`weight` and `start_weight`) is confusing but currently works because `getProfile()` returns both. If someone refactors to use the shared `Profile` type (which only has `start_weight`), the calorie engine would break since it reads `p.weight`.

### 🟠 A3. `sex` case inconsistency

| Layer | Stored as | Expected |
|-------|-----------|----------|
| **DB** | `'m'` or `'f'` (lowercase, CHECK constraint) | lowercase |
| **Signup form** | sends `'M'` or `'F'` (uppercase) | — |
| **API `doRegister()`** | `String(body.sex).toLowerCase()` | ✅ normalizes |
| **Profile edit select** | options are `value="M"` / `value="F"` (uppercase) | — |
| **API `updateProfile()`** | `String(body.sex).toLowerCase()` | ✅ normalizes |
| **API `adminUpdateUser()`** | NO normalization, writes raw | ❌ could write 'M' |
| **Profile display** | shows raw `$profile.sex` | Shows 'M' or 'm' depending on source |
| **Calorie engine** | `(p.sex \|\| 'm').toLowerCase()` | ✅ handles both |

**Bug**: `adminUpdateUser()` does not lowercase `sex`. If admin saves a user, sex goes in as uppercase, which may violate the CHECK constraint or produce inconsistent display.

---

## 2. Admin Panel — API Field Gaps

### 🔴 B1. `program_id` silently dropped by API

- Admin UI (`UserDetail.svelte` line 206) sends `program_id` in the save payload
- API `adminUpdateUser()` allowed list (line 1292) has `program` but NOT `program_id`
- The `program_id` column EXISTS in the users table (migration 0018)
- **Result**: Admin changes to program assignment are silently ignored. The API returns `{ ok: true }` but the field was never written.

### 🟠 B2. `getProfile()` doesn't return `program_id`

- The `getProfile()` function (line 451-484) does `SELECT *` but only maps specific columns to the response
- `program_id` is not in the response mapping
- Frontend never receives the user's current `program_id` from the server
- The admin UI reads it from the full profile response, but it's actually never there — it defaults to `'aevum'` on line 80: `programId = String(p.program_id ?? 'aevum')`

### 🟡 B3. Admin UI missing fields

Fields the API's `adminUpdateUser()` accepts but the admin UI doesn't expose:

| Field | In API allowed list | In admin UI |
|-------|-------------------|-------------|
| `act` (activity) | ✅ | ❌ |
| `start_weight` | ✅ | ❌ |
| `maintenance_mode` | ✅ | ❌ |
| `maintenance_diet` | ✅ | ❌ |
| `stab_target_weight` | ✅ | ❌ |
| `notes` | ✅ | ❌ |
| `age` | ✅ | ❌ (computed from dob) |
| `phase_mode` | ✅ | ❌ |

---

## 3. Duplicate Mifflin-St Jeor Implementations

### 🟠 C1. Formula copy-pasted 8 times instead of using `@aevum/shared`

The Mifflin TDEE formula `(10 * weight + 6.25 * height - 5 * age + s) * actFactor` is inlined in:

1. `v2-api/src/index.js` line 278 — `doRegister()`
2. `v2-api/src/index.js` line 389 — `completeProfile()`
3. `v2-api/src/index.js` line 1331 — `adminUserCreate()`
4. `v2-api/src/index.js` line 1440 — intake onboarding
5. `apps/api/src/routes/auth.ts` line 27
6. `apps/api/src/routes/profile.ts` line 58
7. `apps/api/src/routes/admin.ts` line 160
8. `apps/api/src/routes/intake.ts` line 85

The shared package (`packages/shared/src/calories.ts`) exports `mifflinTDEE()` — the single source of truth — but NONE of the backend files import it. Only the frontend `calorie.ts` uses it.

**Risk**: If the formula ever needs updating (e.g. rounding, edge-case guards), it must be changed in 8+ places. Any inconsistency creates different TDEE values between frontend and backend.

---

## 4. Signup → Profile Data Flow Issues

### 🟠 D1. Signup activity labels don't match tracker labels (#53)

**Signup form** (`login/+page.svelte` lines 309-315):
```
Sedentary / Lightly Active / Moderately Active / Very Active / Extra Active
```
Values sent: `sedentary`, `light`, `moderate`, `active`, `extra`

**Config store** (`config.ts` line 26-27):
```
act_labels: 'No exercise,1-3 days/week,3-5 days/week,6-7 days/week,Athlete / physical job + training'
```

**Profile edit** (`ProfilePanel.svelte` lines 161-164) uses config labels with **numeric factors** as values.

**`resolveActivity()`** on the API side reads the config table for labels. If config has frequency-based labels, the signup's "moderate" won't match "3-5 days/week", so it would fall back to the default numeric index (position 2 = 1.55).

**Result**: It "works" by accident — "moderate" maps to index 2 which is 1.55 — but the signup UI shows wrong labels to the user. The user sees "Moderately Active" but the system stores a frequency-based factor.

### 🟡 D2. Free registration builds profile locally, skips server profile fetch

In `handleFreeRegister()` (line 183-193), the local profile is built from form data and saved directly:
```ts
const prof: UserProfile = {
  name, sex: freeSex, dob: freeDob,
  height: +freeHeight, weight: +freeWeight,
  act: freeAct, program: false
};
```

This profile is missing: `start_date`, `current_target_kcal`, `age`, `target_kg`, and all the phase fields. The server calculates TDEE during registration and returns it, but the code ignores `d.current_target_kcal` from the response.

**Impact**: After free signup, the locally stored profile has no `current_target_kcal`, so the calorie engine falls through to computing it live (which works), but the Profile Panel would show no target.

### 🔴 D3. Sex/activity not showing after signup (#56)

Root cause chain:
1. Signup sends `act: "moderate"` → API resolves to 1.55 → DB stores `activity = 1.55`
2. `getProfile()` returns `act: row.activity` = `1.55` (numeric)
3. Profile panel displays: `activityLabel(1.55)` → finds closest factor match → shows frequency label ✅ **This actually works**
4. BUT — the local profile from `handleFreeRegister()` stores `act: "moderate"` (string)
5. `activityLabel("moderate")` → tries to match "moderate" against config labels ("No exercise", "1-3 days/week"...) → **no match** → falls through to `parseFloat("moderate")` → NaN → returns raw string "moderate"

**For sex**: Signup stores `freeSex` as `"M"` (uppercase). The profile displays `$profile.sex` which shows `"M"`. This is technically showing but might look like a code value rather than "Male". Actually — this isn't the #56 bug. The #56 bug is more likely about the **Google OAuth flow**:
- Google signup shows the free form AFTER auth
- The form submits to `register` but the user already has a `token` and `pid` from Google auth
- If `register` fails or the profile isn't saved properly, sex/act are lost

**Need to verify**: Does `register` work when user already has a token from Google auth, or does it try to create a duplicate?

---

## 5. Phase System Issues

### 🔴 E1. Phase change is retroactive (#52)

`phaseFor()` in `phases.ts` computes the phase for ANY day number by counting through phase durations from the profile. When `phase_mode` changes (e.g. maintenance → recomposition), it changes the computation for ALL historical days.

**Current mitigation**: The `phaseTransitions` array from the API is used by `sharedPhaseFor()` to respect recorded transitions. But:
- Transitions are only fetched on login, not updated in real-time
- If admin changes `phase_mode`, no transition record is created
- The `syncDay()` function DOES stamp `phase` into the sync payload, but that's just for the daily_logs table — the localStorage day data doesn't get the phase stamped

**Fix required**: Stamp phase into `day_json` at save time. On phase_mode change, create a transition record.

### 🟡 E2. `phaseFor()` is called with inconsistent argument types

The function signature is `phaseFor(dayNum: number, prof?: Record<string, unknown> | null)` but callers pass:
- `get(profile)` which is `UserProfile | null`
- A plain object from admin detail
- `null`

Works because of the `[key: string]: unknown` index signature on `UserProfile`, but fragile.

---

## 6. Sync & Data Integrity

### 🟡 F1. Sync retry queue never truly expires

In `flushSyncQueue()`, when a sync entry exceeds `MAX_RETRIES` (3), it's kept in the queue with retries reset to 0 and `nextRetryAt = 0`. This means it retries forever across sessions. Stale sync entries from weeks ago could keep retrying.

### 🟡 F2. `saveDay()` doesn't sync automatically

`saveDay()` writes to localStorage but doesn't call `syncDay()`. Callers must call both separately. Some UI paths may save without syncing, leading to local-only data.

### 🟡 F3. `hydrateFromBackend()` uses timestamp comparison but timestamps come from different clocks

`syncDay()` uses `Date.now()` from the client. `hydrateFromBackend()` compares client-stored timestamps against server timestamps. If the user has clock skew, newer server data could be rejected or older client data could win.

---

## 7. Configuration & Constants

### 🟡 G1. `DEFAULTS` in config.ts duplicate phase registry values

Config defaults include `bank_window: 4`, `bank_clamp_lo: 0.85`, `bank_clamp_hi: 1.15` — these same values are also in the phases table. When the calorie bank (#37c) is built, there's a question of which source wins: the config store defaults or the phase registry columns.

### 🟢 G2. `APP_VERSION` hardcoded in two places

`ProfilePanel.svelte` line 35: `const APP_VERSION = 'v3.1.6'`
This should come from a single source (config or build-time env var), not be hardcoded per component.

---

## 8. API Security & Robustness

### 🟡 H1. `adminUpdateUser()` has no field-level validation

Unlike `updateProfile()` which validates each field (lowercases sex, resolves activity, validates phase_mode values), `adminUpdateUser()` writes raw values directly:

```js
for (const key of allowed) {
    if (body[key] !== undefined) {
        sets.push(`${key} = ?`);
        vals.push(body[key]);
    }
}
```

No type coercion, no validation. Admin could write strings to numeric columns, invalid phase_mode values, etc.

### 🟡 H2. `updateProfile()` doesn't recalculate TDEE

When a user updates their height, sex, or dob via the profile editor, the API's `updateProfile()` does NOT recalculate `current_target_kcal`. The frontend calorie engine uses `liveTDEE()` (which recomputes from current weight), so the displayed target is correct — but the DB's `current_target_kcal` becomes stale.

This matters when admin reads `current_target_kcal` to check a user's baseline — the DB value could be from registration, never updated.

---

## 9. Frontend Component Issues

### 🟡 I1. Profile edit sends numeric factor, display expects string label

`ProfilePanel.svelte` edit mode (line 163):
```svelte
<option value={String(actFactors()[i])}>{label}</option>
```

This stores the numeric factor (e.g. "1.55") as the `editAct` value. The `saveEdit()` sends `act: editAct` = `"1.55"`.

The API's `updateProfile()` calls `resolveActivity("1.55")` → parses as number → returns 1.55 ✅

But `getProfile()` returns `act: 1.55` (number). Next time the profile panel loads, `editAct = p.act || 'moderate'` gets `1.55`, and the select can't find `value="1.55"` in its options (they're `String(actFactors()[i])` which should match). **This probably works** but is fragile — floating point string comparison.

---

## 10. Dead / Orphaned Code

### 🟢 J1. `apps/api/` — parallel API that appears unused

The `apps/api/src/routes/` directory contains Hono-based route files (`auth.ts`, `profile.ts`, `admin.ts`, `intake.ts`) with their own inline Mifflin implementations. The deployed API is `v2-api/`. Are the `apps/api/` routes deployed or dead code?

### 🟢 J2. `calorieBank()` returns 0

The function exists as a stub (line 111-113 of `calorie.ts`). This is intentional (disabled until #37c) but any code calling it gets 0 with no warning.

### 🟢 J3. `stabTDEE()` and `stabTargetKcal()` — used anywhere?

These functions exist in `calorie.ts` but need verification that any component actually calls them.

---

## Fix Priority Order

| Priority | ID | Issue | Effort |
|----------|-----|-------|--------|
| 1 | B1 | `program_id` not in API allowed list — admin save silently fails | 5 min |
| 2 | A1 | `act` vs `activity` in `adminUpdateUser()` — SQL column mismatch | 10 min |
| 3 | A3 | `sex` not normalized in `adminUpdateUser()` | 5 min |
| 4 | B2 | `getProfile()` doesn't return `program_id` | 5 min |
| 5 | E1 | Phase retroactivity (#52) — stamp phase into day_json | 2-3 hrs |
| 6 | D1 | Signup activity labels (#53) — match config labels | 30 min |
| 7 | D3 | Sex/activity after signup (#56) — local profile missing server values | 30 min |
| 8 | C1 | Consolidate Mifflin to shared package across all backends | 1-2 hrs |
| 9 | H1 | Add validation to `adminUpdateUser()` | 1 hr |
| 10 | D2 | Free registration should merge server response into local profile | 15 min |
| 11 | F1 | Sync retry queue infinite loop | 15 min |
| 12 | H2 | Recalculate TDEE on profile update | 30 min |
| 13 | G2 | Centralize APP_VERSION | 15 min |
| 14 | J1 | Audit if `apps/api/` is deployed or dead | 15 min |

---

## Summary

**Critical (data loss / silent failure)**: 3 issues — B1 (program_id dropped), A1 (activity column mismatch in admin), E1 (retroactive phases)

**High (broken features)**: 5 issues — A2 (weight naming), A3 (sex case), B2 (program_id not returned), D1 (signup labels), D3 (missing fields after signup)

**Medium (inconsistency / tech debt)**: 8 issues

**Low (cleanup)**: 3 issues

The most impactful quick wins are B1, A1, A3, B2 — all admin API fixes that take 5-10 minutes each and resolve silent data loss. The phase retroactivity (E1) is the biggest architectural fix needed.
