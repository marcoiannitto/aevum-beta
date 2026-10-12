# AEVUM Beta (V2)

AEVUM is the tracker app for [Niramaya's](https://niramaya.sg) metabolic wellness program. This repo (`aevum-beta`) is the **V2 sandbox**, where all active development happens before migration to the production domain (`app.niramaya.sg`).

> **Do NOT confuse with `aevum-app`** (V1 production). That repo is legacy and should not be modified.

Live at: **https://beta.niramaya.sg**


## Architecture

```
┌─────────────────────────┐        ┌──────────────────────────────────┐
│   Frontend (SPA)        │        │   Backend (Cloudflare Worker)     │
│   index.html            │  POST  │   aevum-api-v2                   │
│   admin.html            │───────>│   /v2-api/src/index.js           │
│                         │  JSON  │                                  │
│   Hosted: GitHub Pages  │<───────│   Hosted: Cloudflare Workers     │
│   beta.niramaya.sg      │        │   aevum-api-v2.marco-iannitto.   │
│                         │        │     workers.dev                  │
└─────────────────────────┘        └──────────┬───────────────────────┘
                                              │
                                   ┌──────────▼───────────────────────┐
                                   │   Database                       │
                                   │   Cloudflare D1 (SQLite)         │
                                   │   aevum-db                       │
                                   │   ID: 54b6f636-ceac-41e6-bad9-   │
                                   │       60d970c78b33               │
                                   └──────────────────────────────────┘
```

**Stack summary:**

| Layer       | Technology                | Location                          |
|-------------|---------------------------|-----------------------------------|
| Frontend    | Vanilla HTML/JS (single file SPA) | GitHub Pages, `beta.niramaya.sg` |
| Admin panel | Vanilla HTML/JS           | GitHub Pages, `beta.niramaya.sg/admin.html` |
| Backend API | Cloudflare Worker (ES modules) | `aevum-api-v2.marco-iannitto.workers.dev` |
| Database    | Cloudflare D1 (SQLite)    | `aevum-db`                        |
| AI features | Cloudflare AI Worker + Anthropic Claude Haiku | Proxied via separate worker |
| DNS/CDN     | Cloudflare                | `niramaya.sg` zone                |


## Repo Structure

```
aevum-beta/
├── .github/
│   └── workflows/
│       └── deploy-worker.yml   # Auto-deploys worker on push to main
├── v2-api/
│   ├── src/
│   │   └── index.js            # Entire backend (single Worker file)
│   └── wrangler.toml           # Cloudflare Worker config
├── fitness/                    # Exercise video assets (.mp4)
├── index.html                  # Main app (SPA, entire frontend)
├── admin.html                  # Admin dashboard
├── health-disclaimer.html      # Legal: health disclaimer
├── privacy.html                # Legal: privacy policy
├── terms.html                  # Legal: terms of service
├── seed.js                     # DB seed script (rules, foods, policy, config)
├── migrate.js                  # Data migration helper
├── fix-day34.js                # One-off data fix script
├── usda_database_simplified.json  # USDA food database for nutrition lookups
├── AEVUM_Pilot_Data.txt        # Pilot program data
└── CNAME                       # GitHub Pages custom domain config
```


## Deployment

### Frontend (automatic)

Every push to `main` auto-deploys to GitHub Pages at `beta.niramaya.sg`.

No build step. The HTML files are served as-is.

### Backend API (automatic, with setup)

A GitHub Action (`.github/workflows/deploy-worker.yml`) auto-deploys the Worker when files under `v2-api/` change on `main`.

**Prerequisite:** The repo needs a GitHub secret:

| Secret name            | Value                                    |
|------------------------|------------------------------------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers + D1 edit permissions |

To create the token: Cloudflare Dashboard > Profile > API Tokens > "Edit Cloudflare Workers" template.

**Manual deploy** (if needed):
```bash
cd v2-api
npx wrangler@3 deploy
```

> Use wrangler v3, not v4. Wrangler 4 changed defaults that break this setup.


## Backend API

Single endpoint: `POST https://aevum-api-v2.marco-iannitto.workers.dev/`

All requests are JSON with an `action` field. Auth is via `Authorization: Bearer <token>` header.

### CORS

Allowed origins:
- `https://beta.niramaya.sg` (production)
- `http://localhost:*` (development)

### Unauthenticated Routes

| Action        | Description                              |
|---------------|------------------------------------------|
| `register`    | Create free account (name, sex, dob, height, weight, act, target_kg) |
| `auth_google` | Google Sign-In (verifies ID token, creates or returns user) |
| `login`       | Login with token code                    |

### Authenticated Routes (user)

| Action            | Description                              |
|-------------------|------------------------------------------|
| `profile`         | Get user profile                         |
| `complete_profile`| Set profile fields after Google auth (sex, dob, height, weight, act, target_kg) |
| `sync`            | Upsert a daily log entry                 |
| `getdays`         | Get all daily logs for user              |
| `rules`           | Get program rules (phases, metrics)      |
| `config`          | Get app config (messages, etc.)          |
| `messages`        | Get motivational messages                |
| `recipes`         | Get recipe database                      |
| `fitness`         | Get exercise routines                    |
| `foods`           | Get food rules by phase                  |
| `policy`          | Get dietary policy for a phase           |
| `mealplan`        | Get user's meal plan                     |
| `settarget`       | Set stabilization target weight          |
| `savetarget`      | Save target row data                     |
| `graduation`      | Handle phase graduation                  |
| `mealengine`      | AI meal suggestion engine                |
| `estimate`        | AI calorie estimation from description   |
| `foodcheck`       | AI food compliance check                 |
| `shoplist`        | AI shopping list generator               |

### Admin Routes (require admin role)

| Action              | Description                            |
|---------------------|----------------------------------------|
| `admin_users`       | List all users with summary stats      |
| `admin_export`      | Export user data                       |
| `admin_seed`        | Seed reference tables (rules, foods, etc.) |
| `admin_list`        | List rows from a reference table       |
| `admin_import`      | Import rows into a reference table     |
| `admin_update_user` | Update user fields (program, dob, activation_days, targets, etc.) |


## Database (D1)

### Key Tables

**`users`** (one row per user)
- `id` (TEXT PK), `name`, `email`, `sex` (m/f), `dob` (YYYY-MM-DD), `age` (INT, computed from dob)
- `height`, `start_weight`, `activity`, `target_kg`
- `current_target_kcal`, `prev_target_kcal`, `maintenance_mode`, `maintenance_diet`
- `program` (0 = free tracker, 1 = on the AEVUM program)
- `activation_days` (how many days of supplement purchased)
- `stab_target_weight`, `start_date`, `notes`
- `last_review_date`, `last_change_reason`

**`auth_tokens`** (one per user, or per device)
- `token` (TEXT PK), `user_id`, `role` (user/admin)

**`daily_log`** (one row per user per day)
- `user_id`, `day` (INT), `date`, `weight`, `kcal`, `protein`, `carbs`, `fat`, `steps`, `notes`, `photo`, etc.

**Reference tables** (seeded via `seed.js`):
- `rules` (phase/metric rules)
- `foods` (food compliance rules by phase)
- `policy` (dietary policy text)
- `config` (app configuration)
- `messages`, `recipes`, `fitness`

### Running Migrations

```bash
cd v2-api
npx wrangler@3 d1 execute aevum-db --remote --command="<SQL>"
```

Example:
```bash
npx wrangler@3 d1 execute aevum-db --remote --command="ALTER TABLE users ADD COLUMN dob TEXT;"
```

### Seeding Data

```bash
node seed.js <ADMIN_TOKEN>
```

The admin token is stored as a Cloudflare secret. To set/update:
```bash
cd v2-api
npx wrangler@3 secret put ADMIN_TOKEN
```


## Auth Flow

1. **Google Sign-In** (primary): User clicks Google button, frontend gets ID token, sends `auth_google`. Backend verifies with Google, creates or finds user, returns app token.
2. **Login code**: User enters a pre-issued token, sends `login`. Backend validates against `auth_tokens` table.
3. **Free registration**: User fills onboarding form, sends `register`. Backend creates user + token.

Tokens are stored in `localStorage` on the frontend.


## Key Business Logic

### TDEE Calculation (Mifflin-St Jeor)

```
BMR = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + s
  where s = +5 (male), -161 (female)
TDEE = BMR * activity_multiplier
```

Activity multipliers: 1.2 (sedentary) to 2.1 (athlete).

Age is dynamically computed from date of birth.

### Program Phases

| Phase          | Days    | Description                    |
|----------------|---------|--------------------------------|
| Loading        | 1-2     | Free eating, baseline          |
| Activation     | 3-N     | Low calorie (525-650 kcal), N = activation_days |
| Transition     | 3 days  | Gradual calorie increase       |
| Stabilization  | 18 days | Adaptive TDEE-based targets    |
| Maintenance    | Ongoing | Long-term (keto/high-protein/balanced) |


## Secrets (Cloudflare)

Set via CLI:
```bash
cd v2-api
npx wrangler@3 secret put <NAME>
```

| Secret           | Purpose                          |
|------------------|----------------------------------|
| `ADMIN_TOKEN`    | Admin auth for admin_* routes    |
| `GOOGLE_CLIENT_ID` | Google OAuth verification      |
| `AI_WORKER_URL`  | URL of the AI proxy worker       |
| `ANTHROPIC_KEY`  | API key for Claude Haiku calls   |


## Local Development

There is no local dev server setup. To test:

1. Open `index.html` directly in a browser (or use a local HTTP server)
2. The frontend uses `localhost` origin which is in the CORS allowlist
3. API calls go to the live Worker (no local backend emulation)

For backend changes, deploy to the live Worker and test against it.


## Admin Panel

Access: `https://beta.niramaya.sg/admin.html`

Login with an admin token (a token in `auth_tokens` with `role = 'admin'`).

Features:
- User list with search
- User detail view (daily logs, weight chart, compliance stats)
- Editable fields: activation_days, calorie target, target weight, sex, DOB, height
- Program toggle (on/off)
- Data export


## Important Notes

- **This is the V2 sandbox.** Production (V1) lives in `aevum-app` repo at `app.niramaya.sg`. Do not modify `aevum-app`.
- **Wrangler v3 only.** Do not upgrade to wrangler v4, it breaks the deploy config.
- **Single-file architecture.** The entire frontend is one `index.html`. The entire backend is one `index.js`. This is intentional for simplicity.
- **No build step.** No bundler, no framework, no npm for the frontend. Just static files.
