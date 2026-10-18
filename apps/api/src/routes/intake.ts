/**
 * Intake form routes — public (token-based) and admin.
 */

import { dobToAge } from '@aevum/shared';

// ─── Helpers ────────────────────────────────────────────────

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let t = '';
  for (let i = 0; i < 21; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

// ─── Public intake routes (called from Hono REST handlers) ──

export async function handleIntakeGet(token: string, db: D1Database) {
  const row = await db.prepare('SELECT * FROM intake_tokens WHERE token = ?').bind(token).first<any>();
  if (!row) return { _status: 404, error: 'Invalid or expired link' };
  if (row.expires_at && new Date(row.expires_at + 'Z') < new Date()) {
    return { _status: 410, error: 'This link has expired. Please contact Marco.' };
  }
  if (row.status === 'submitted' || row.status === 'review_required' || row.status === 'approved') {
    return {
      status: row.status,
      submitted: true,
      client_name: JSON.parse(row.prefill_json || '{}').full_name || row.client_name,
    };
  }

  // Mark as in_progress if still sent
  if (row.status === 'sent') {
    await db.prepare("UPDATE intake_tokens SET status = 'in_progress' WHERE token = ?").bind(token).run();
  }
  const prefill = JSON.parse(row.prefill_json || '{}');
  const response = row.response_json ? JSON.parse(row.response_json) : null;
  return { prefill, response, current_step: row.current_step, status: row.status };
}

export async function handleIntakeSave(token: string, body: any, db: D1Database) {
  const row = await db.prepare('SELECT status FROM intake_tokens WHERE token = ?').bind(token).first<any>();
  if (!row) return { _status: 404, error: 'Invalid or expired link' };
  if (row.status === 'submitted' || row.status === 'review_required' || row.status === 'approved') {
    return { _status: 409, error: 'Already submitted' };
  }

  const responseJson = JSON.stringify(body.response || {});
  const step = parseInt(body.current_step) || 0;
  await db.prepare(
    "UPDATE intake_tokens SET response_json = ?, current_step = ?, status = 'in_progress' WHERE token = ?",
  ).bind(responseJson, step, token).run();
  return { ok: true };
}

export async function handleIntakeSubmit(token: string, body: any, db: D1Database) {
  const row = await db.prepare('SELECT * FROM intake_tokens WHERE token = ?').bind(token).first<any>();
  if (!row) return { _status: 404, error: 'Invalid or expired link' };
  if (row.status === 'submitted' || row.status === 'review_required' || row.status === 'approved') {
    return { _status: 409, error: 'Already submitted' };
  }

  const responseJson = JSON.stringify(body.response || {});
  const prefill = JSON.parse(row.prefill_json || '{}');
  const resp = body.response || {};

  // Check disqualifiers
  let status = 'submitted';
  if (resp.pregnant === true || resp.pregnant === 'yes') status = 'review_required';
  if (resp.has_medical_conditions === true) status = 'review_required';

  await db.prepare(
    "UPDATE intake_tokens SET response_json = ?, current_step = 5, status = ?, submitted_at = datetime('now') WHERE token = ?",
  ).bind(responseJson, status, token).run();

  // Create user record from intake data
  const name = prefill.full_name || row.client_name;
  const dob = prefill.dob || prefill.date_of_birth || '';
  const age = dob ? dobToAge(dob) : 0;
  const height = parseFloat(prefill.height || prefill.height_cm) || 0;
  const weight = parseFloat(prefill.weight || prefill.weight_kg) || 0;
  const sex = String(prefill.sex || 'm').toLowerCase();
  const act = 1.55;
  const s = sex === 'm' ? 5 : -161;
  const tdee = (height && weight && age) ? Math.round((10 * weight + 6.25 * height - 5 * age + s) * act) : 0;

  const base = name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8) || 'user';
  const rnd = Math.random().toString(36).slice(2, 6);
  const userId = base + '_' + rnd;
  const userToken = crypto.randomUUID();

  try {
    await db.batch([
      db.prepare(
        `INSERT INTO users (id, name, sex, dob, age, height, start_weight, activity, target_kg,
          current_target_kcal, program, email, intake_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      ).bind(userId, name, sex, dob || null, age, height, weight, act, parseFloat(prefill.target_kg) || null, tdee, prefill.email || null, token),
      db.prepare(
        'INSERT INTO auth_tokens (token, user_id, role) VALUES (?, ?, ?)',
      ).bind(userToken, userId, 'user'),
    ]);
  } catch (e: any) {
    // Fallback if intake_token column not yet migrated
    if (String(e).includes('intake_token')) {
      await db.batch([
        db.prepare(
          `INSERT INTO users (id, name, sex, dob, age, height, start_weight, activity, target_kg,
            current_target_kcal, program, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        ).bind(userId, name, sex, dob || null, age, height, weight, act, parseFloat(prefill.target_kg) || null, tdee, prefill.email || null),
        db.prepare(
          'INSERT INTO auth_tokens (token, user_id, role) VALUES (?, ?, ?)',
        ).bind(userToken, userId, 'user'),
      ]);
    } else {
      throw e;
    }
  }

  return { ok: true, status, user_id: userId };
}

// ─── Admin intake routes ────────────────────────────────────

export async function adminIntakeCreate(body: any, db: D1Database) {
  const prefill = body.prefill || {};
  const name = String(prefill.full_name || body.client_name || '').trim();
  if (!name) return { error: 'client name required' };

  const token = generateToken();
  const expiryDays = parseInt(body.expiry_days) || 14;

  await db.prepare(
    `INSERT INTO intake_tokens (token, client_name, prefill_json, status, expires_at)
     VALUES (?, ?, ?, 'draft', datetime('now', '+' || ? || ' days'))`,
  ).bind(token, name, JSON.stringify(prefill), expiryDays).run();

  return { ok: true, token, url: '/intake/' + token };
}

export async function adminIntakesList(body: any, db: D1Database) {
  const status = body.status || null;
  let q = 'SELECT token, client_name, status, current_step, created_at, expires_at, submitted_at FROM intake_tokens';
  const params: any[] = [];
  if (status) { q += ' WHERE status = ?'; params.push(status); }
  q += ' ORDER BY created_at DESC';
  const rows = await db.prepare(q).bind(...params).all<any>();
  return { intakes: rows.results };
}

export async function adminIntakeGet(body: any, db: D1Database) {
  const token = String(body.token || '');
  if (!token) return { error: 'token required' };
  const row = await db.prepare('SELECT * FROM intake_tokens WHERE token = ?').bind(token).first<any>();
  if (!row) return { error: 'not found' };
  // Look up linked user
  let userId: string | null = null;
  try {
    const user = await db.prepare('SELECT id FROM users WHERE intake_token = ?').bind(token).first<any>();
    if (user) userId = user.id;
  } catch (_) { /* intake_token column may not exist yet */ }
  return {
    ...row,
    prefill: JSON.parse(row.prefill_json || '{}'),
    response: row.response_json ? JSON.parse(row.response_json) : null,
    user_id: userId,
  };
}

export async function adminIntakeUpdate(body: any, db: D1Database) {
  const token = String(body.token || '');
  if (!token) return { error: 'token required' };
  const row = await db.prepare('SELECT status FROM intake_tokens WHERE token = ?').bind(token).first<any>();
  if (!row) return { error: 'not found' };
  if (row.status !== 'draft') return { error: 'Cannot edit: intake already sent' };

  const prefill = body.prefill || {};
  const name = String(prefill.full_name || body.client_name || '').trim();
  await db.prepare(
    'UPDATE intake_tokens SET prefill_json = ?, client_name = ? WHERE token = ?',
  ).bind(JSON.stringify(prefill), name || undefined, token).run();
  return { ok: true };
}

export async function adminIntakeStatus(body: any, db: D1Database) {
  const token = String(body.token || '');
  const status = String(body.status || '');
  if (!token || !status) return { error: 'token and status required' };
  const valid = ['draft', 'sent', 'in_progress', 'submitted', 'review_required', 'approved'];
  if (!valid.includes(status)) return { error: 'invalid status' };
  await db.prepare('UPDATE intake_tokens SET status = ? WHERE token = ?').bind(status, token).run();
  return { ok: true };
}

export async function adminIntakeResend(body: any, db: D1Database) {
  const oldToken = String(body.token || '');
  if (!oldToken) return { error: 'token required' };
  const row = await db.prepare('SELECT * FROM intake_tokens WHERE token = ?').bind(oldToken).first<any>();
  if (!row) return { error: 'not found' };

  const newToken = generateToken();
  await db.batch([
    db.prepare("UPDATE intake_tokens SET expires_at = datetime('now'), status = 'draft' WHERE token = ?").bind(oldToken),
    db.prepare(
      `INSERT INTO intake_tokens (token, client_name, prefill_json, status, expires_at)
       VALUES (?, ?, ?, 'draft', datetime('now', '+14 days'))`,
    ).bind(newToken, row.client_name, row.prefill_json),
  ]);

  return { ok: true, token: newToken, url: '/intake/' + newToken };
}

export async function adminIntakeDelete(body: any, db: D1Database) {
  const token = String(body.token || '');
  if (!token) return { error: 'token required' };
  const row = await db.prepare('SELECT token FROM intake_tokens WHERE token = ?').bind(token).first<any>();
  if (!row) return { error: 'not found' };
  await db.prepare('DELETE FROM intake_tokens WHERE token = ?').bind(token).run();
  return { ok: true };
}
