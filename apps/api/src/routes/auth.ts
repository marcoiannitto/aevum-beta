/**
 * Auth route handlers: register, Google login, token login.
 */

import { dobToAge } from '@aevum/shared';
import type { Env } from '../env.js';

/** Register a new user with profile data. */
export async function doRegister(body: any, db: D1Database) {
  const name = String(body.name || '').trim();
  if (!name) return { error: 'name required' };

  const sex = String(body.sex || '').toLowerCase();
  if (sex !== 'm' && sex !== 'f') return { error: 'sex must be m or f' };

  const dob = String(body.dob || '').trim(); // YYYY-MM-DD
  const age = dob ? dobToAge(dob) : (parseInt(body.age) || 0);
  const height = parseFloat(body.height) || 0;
  const weight = parseFloat(body.weight) || 0;
  const act = parseFloat(body.act) || 1.55;
  const target_kg = parseFloat(body.target_kg) || null;

  if (!age || !height || !weight) return { error: 'dob/age, height, weight required' };

  // Mifflin TDEE (inline to match original behavior exactly)
  const s = sex === 'm' ? 5 : -161;
  const tdee = Math.round((10 * weight + 6.25 * height - 5 * age + s) * act);

  // Generate unique ID
  const base = name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8);
  const rnd = Math.random().toString(36).slice(2, 6);
  const id = base + '_' + rnd;

  // Generate auth token
  const token = crypto.randomUUID();

  await db.batch([
    db.prepare(
      `INSERT INTO users (id, name, sex, dob, age, height, start_weight, activity, target_kg,
        current_target_kcal, program) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    ).bind(id, name, sex, dob || null, age, height, weight, act, target_kg, tdee),
    db.prepare(
      'INSERT INTO auth_tokens (token, user_id, role) VALUES (?, ?, ?)'
    ).bind(token, id, 'user'),
  ]);

  return { id, token, program: false, current_target_kcal: tdee, sex, act };
}

/** Verify Google ID token, find or create user. */
export async function authGoogle(body: any, db: D1Database, env: Env) {
  const idToken = String(body.id_token || '').trim();
  if (!idToken) return { error: 'id_token required' };

  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) return { error: 'Google login not configured' };

  // Verify the token via Google's tokeninfo endpoint
  const resp = await fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
  );
  if (!resp.ok) return { error: 'Invalid Google token' };

  const goog: any = await resp.json();

  // Verify audience matches our client ID
  if (goog.aud !== clientId) return { error: 'Token audience mismatch' };

  const email = (goog.email || '').toLowerCase().trim();
  const name: string = goog.name || goog.given_name || email.split('@')[0];
  if (!email) return { error: 'No email in Google token' };

  // Check if user exists with this email
  const user = await db
    .prepare('SELECT id, program FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; program: number | null }>();

  if (user) {
    // Existing user: issue or reuse token
    let tokenRow = await db
      .prepare('SELECT token FROM auth_tokens WHERE user_id = ? AND role = ?')
      .bind(user.id, 'user')
      .first<{ token: string }>();

    if (!tokenRow) {
      const token = crypto.randomUUID();
      await db
        .prepare('INSERT INTO auth_tokens (token, user_id, role) VALUES (?, ?, ?)')
        .bind(token, user.id, 'user')
        .run();
      tokenRow = { token };
    }

    return { id: user.id, token: tokenRow.token, program: !!user.program, existing: true };
  }

  // New user: create with Google profile info
  const base = name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8) || 'user';
  const rnd = Math.random().toString(36).slice(2, 6);
  const id = base + '_' + rnd;
  const token = crypto.randomUUID();

  await db.batch([
    db.prepare('INSERT INTO users (id, name, email, program) VALUES (?, ?, ?, 0)').bind(
      id,
      name,
      email,
    ),
    db.prepare('INSERT INTO auth_tokens (token, user_id, role) VALUES (?, ?, ?)').bind(
      token,
      id,
      'user',
    ),
  ]);

  return { id, token, program: false, existing: false, needs_profile: true };
}

/** Token login for returning users. */
export async function doLogin(body: any, db: D1Database) {
  const token = String(body.token || '').trim();
  if (!token) return { error: 'token required' };

  const row = await db
    .prepare(
      'SELECT user_id, role FROM auth_tokens WHERE token = ? AND (expires_at IS NULL OR expires_at > datetime("now"))',
    )
    .bind(token)
    .first<{ user_id: string; role: string }>();

  if (!row) return { error: 'Invalid or expired token' };

  const user = await db
    .prepare('SELECT id, name, program FROM users WHERE id = ?')
    .bind(row.user_id)
    .first<{ id: string; name: string; program: number | null }>();

  if (!user) return { error: 'User not found' };

  return { id: user.id, name: user.name, program: !!user.program, valid: true };
}
