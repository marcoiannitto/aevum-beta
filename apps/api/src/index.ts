/**
 * AEVUM API — Hono entry point for Cloudflare Workers.
 *
 * Backward-compatible: the existing frontend sends POST / with { action: "..." }.
 * This dispatcher maps each action to its typed handler.
 * Public intake routes use proper REST verbs on /intake/:token.
 */

import { Hono } from 'hono';
import type { Env } from './env.js';
import type { AuthUser } from './middleware/auth.js';
import { corsMiddleware } from './middleware/cors.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';

// ─── Route handlers ──────────────────────────────────────────
import { doRegister, authGoogle, doLogin } from './routes/auth.js';
import { getProfile, completeProfile, updateProfile } from './routes/profile.js';
import { syncRow, getDays } from './routes/sync.js';
import { getRules } from './routes/rules.js';
import {
  getConfig, getPhases, getMessages, getRecipes,
  getFitness, getFoods, getPolicy,
} from './routes/data.js';
import { getMealPlan, mealEngine } from './routes/meals.js';
import { setStabTarget, saveTargetRow } from './routes/targets.js';
import { graduation } from './routes/graduation.js';
import { estimateMeal, foodCheck, shopList } from './routes/ai.js';
import {
  handleIntakeGet, handleIntakeSave, handleIntakeSubmit,
  adminIntakeCreate, adminIntakesList, adminIntakeGet,
  adminIntakeUpdate, adminIntakeStatus, adminIntakeResend,
  adminIntakeDelete,
} from './routes/intake.js';
import {
  adminUsers, adminExport, adminSeed, adminList,
  adminImport, adminUpdateUser, adminUserCreate,
  adminUserDelete, adminScanSave, adminScanList,
  adminScanDelete,
} from './routes/admin.js';

// ─── Helpers ────────────────────────────────────────────────

/** Strip _status from response and use it as HTTP status code */
function jsonWithStatus(c: any, data: any) {
  const status = data._status || 200;
  if (data._status) {
    const { _status, ...rest } = data;
    return c.json(rest, status);
  }
  return c.json(data, status);
}

// ─── App ─────────────────────────────────────────────────────

type AppEnv = { Bindings: Env; Variables: { user: AuthUser } };

const app = new Hono<AppEnv>();

// Global middleware
app.use('*', corsMiddleware);
app.use('*', rateLimitMiddleware);

// ─── Public intake REST routes ───────────────────────────────

app.get('/intake/:token', async (c) => {
  const token = c.req.param('token');
  const db = c.env.DB;
  return jsonWithStatus(c, await handleIntakeGet(token, db));
});

app.put('/intake/:token/save', async (c) => {
  const token = c.req.param('token');
  const db = c.env.DB;
  const body = await c.req.json();
  return jsonWithStatus(c, await handleIntakeSave(token, body, db));
});

app.post('/intake/:token/save', async (c) => {
  const token = c.req.param('token');
  const db = c.env.DB;
  const body = await c.req.json();
  return jsonWithStatus(c, await handleIntakeSave(token, body, db));
});

app.post('/intake/:token/submit', async (c) => {
  const token = c.req.param('token');
  const db = c.env.DB;
  const body = await c.req.json();
  return jsonWithStatus(c, await handleIntakeSubmit(token, body, db));
});

// ─── Action dispatcher (backward compat) ─────────────────────

app.post('/', async (c) => {
  const db = c.env.DB;
  const env = c.env;
  let body: Record<string, unknown>;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const action = String(body.action || '');
  if (!action) return c.json({ error: 'action required' }, 400);

  // ── Unauthenticated actions ───────────────────────────────
  switch (action) {
    case 'register':
      return c.json(await doRegister(body, db));
    case 'auth_google':
      return c.json(await authGoogle(body, db, env));
    case 'login':
      return c.json(await doLogin(body, db));
  }

  // ── Auth required from here ───────────────────────────────
  const authHeader = c.req.header('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  const authRow = await db.prepare(
    'SELECT user_id, role FROM auth_tokens WHERE token = ? AND (expires_at IS NULL OR expires_at > datetime("now"))'
  ).bind(token).first<{ user_id: string; role: string }>();

  if (!authRow) return c.json({ error: 'Unauthorized' }, 401);

  const userId = authRow.user_id;
  const isAdmin = authRow.role === 'admin';

  try {
  // ── Admin actions ─────────────────────────────────────────
  if (action.startsWith('admin_')) {
    if (!isAdmin) return c.json({ error: 'Admin required' }, 403);

    switch (action) {
      case 'admin_users':
        return c.json(await adminUsers(db));
      case 'admin_export':
        return c.json(await adminExport(body, db));
      case 'admin_seed':
        return c.json(await adminSeed(body, db));
      case 'admin_list':
        return c.json(await adminList(body, db));
      case 'admin_import':
        return c.json(await adminImport(body, db));
      case 'admin_update_user':
        return c.json(await adminUpdateUser(body, db));
      case 'admin_user_create':
        return c.json(await adminUserCreate(body, db));
      case 'admin_user_delete':
        return c.json(await adminUserDelete(body, db));
      case 'admin_intake_create':
        return c.json(await adminIntakeCreate(body, db));
      case 'admin_intakes_list':
        return c.json(await adminIntakesList(body, db));
      case 'admin_intake_get':
        return c.json(await adminIntakeGet(body, db));
      case 'admin_intake_update':
        return c.json(await adminIntakeUpdate(body, db));
      case 'admin_intake_status':
        return c.json(await adminIntakeStatus(body, db));
      case 'admin_intake_resend':
        return c.json(await adminIntakeResend(body, db));
      case 'admin_intake_delete':
        return c.json(await adminIntakeDelete(body, db));
      case 'admin_scan_save':
        return c.json(await adminScanSave(body, db));
      case 'admin_scan_list':
        return c.json(await adminScanList(body, db));
      case 'admin_scan_delete':
        return c.json(await adminScanDelete(body, db));
      case 'admin_mealplan': {
        const targetId = String(body.user_id || '');
        if (!targetId) return c.json({ error: 'user_id required' }, 400);
        return c.json(await mealEngine(targetId, body, db));
      }
      default:
        return c.json({ error: 'Unknown admin action: ' + action }, 400);
    }
  }

  // ── User actions ──────────────────────────────────────────
  switch (action) {
    case 'profile':
      return c.json(await getProfile(userId, db));
    case 'complete_profile':
      return c.json(await completeProfile(userId, body, db));
    case 'update_profile':
      return c.json(await updateProfile(userId, body, db));
    case 'sync':
      return c.json(await syncRow(userId, body, db));
    case 'getdays':
      return c.json(await getDays(userId, db));
    case 'rules':
      return c.json(await getRules(userId, db));
    case 'config':
      return c.json(await getConfig(db));
    case 'phases':
      return c.json(await getPhases(db));
    case 'messages':
      return c.json(await getMessages(db));
    case 'recipes':
      return c.json(await getRecipes(db));
    case 'fitness':
      return c.json(await getFitness(db));
    case 'foods':
      return c.json(await getFoods(body, db));
    case 'policy':
      return c.json(await getPolicy(body, db));
    case 'mealplan':
      return c.json(await getMealPlan(userId, db));
    case 'settarget':
      return c.json(await setStabTarget(userId, body, db));
    case 'savetarget':
      return c.json(await saveTargetRow(userId, body, db));
    case 'graduation':
      return c.json(await graduation(userId, body, db, isAdmin));
    case 'mealengine':
      return c.json(await mealEngine(userId, body, db));
    case 'estimate':
      return c.json(await estimateMeal(userId, body, db, env));
    case 'foodcheck':
      return c.json(await foodCheck(body, db, env));
    case 'shoplist':
      return c.json(await shopList(body, env));
    default:
      return c.json({ error: 'Unknown action: ' + action }, 400);
  }
  } catch (err: any) {
    return c.json({ error: String(err.message || err) }, 500);
  }
});

// ─── Fallback ────────────────────────────────────────────────

app.all('*', (c) => c.json({ error: 'Not found' }, 404));

export default app;
