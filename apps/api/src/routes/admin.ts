/**
 * Admin routes: user management, data export/import, seed/list tables.
 */

import { dobToAge } from '@aevum/shared';
import { getProfile } from './profile.js';

export async function adminUsers(db: D1Database) {
  const rows = await db.prepare(
    `SELECT u.id, u.name, u.email, u.program, u.created_at, u.current_target_kcal, u.start_weight,
      (SELECT COUNT(*) FROM daily_logs WHERE user_id = u.id) as log_count,
      (SELECT MAX(day) FROM daily_logs WHERE user_id = u.id) as last_day
    FROM users u ORDER BY u.created_at DESC`
  ).all<any>();
  return { users: rows.results };
}

export async function adminExport(body: any, db: D1Database) {
  const targetId = String(body.id || '').toLowerCase();
  if (!targetId) return { error: 'id required' };
  const logs = await db.prepare('SELECT * FROM daily_logs WHERE user_id = ? ORDER BY day').bind(targetId).all<any>();
  const plans = await db.prepare('SELECT * FROM meal_plans WHERE user_id = ? ORDER BY day').bind(targetId).all<any>();
  const prof = await getProfile(targetId, db);
  return { profile: prof.profile, logs: logs.results, meal_plans: plans.results };
}

export async function adminSeed(body: any, db: D1Database) {
  const table = String(body.table || '');
  const rows = body.rows || [];
  if (!table || !rows.length) return { error: 'table and rows required' };

  const allowed = [
    'recipes', 'messages', 'movements', 'workouts', 'rules', 'foods',
    'policy', 'config', 'ingredients', 'catered_menu', 'phases',
  ];
  if (!allowed.includes(table)) return { error: 'table not allowed: ' + table };

  // Clear existing + insert
  const stmts: D1PreparedStatement[] = [db.prepare(`DELETE FROM ${table}`)];
  for (const row of rows) {
    const keys = Object.keys(row);
    const placeholders = keys.map(() => '?').join(', ');
    stmts.push(
      db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`)
        .bind(...keys.map(k => row[k] ?? null))
    );
  }
  await db.batch(stmts);
  return { ok: true, inserted: rows.length };
}

export async function adminList(body: any, db: D1Database) {
  const table = String(body.table || '');
  const allowed = [
    'recipes', 'messages', 'movements', 'workouts', 'rules', 'foods',
    'policy', 'config', 'ingredients', 'catered_menu', 'phases',
  ];
  if (!allowed.includes(table)) return { error: 'table not allowed: ' + table };
  const rows = await db.prepare(`SELECT * FROM ${table}`).all<any>();
  return { table, rows: rows.results };
}

export async function adminImport(body: any, db: D1Database) {
  const table = String(body.table || '');
  const rows = body.rows || [];
  if (!table || !rows.length) return { error: 'table and rows required' };
  const allowed = ['users', 'daily_logs', 'meal_plans'];
  if (!allowed.includes(table)) return { error: 'table not allowed: ' + table };
  const mode = table === 'users' ? 'INSERT OR REPLACE' : 'INSERT OR IGNORE';
  const stmts: D1PreparedStatement[] = [];
  for (const row of rows) {
    const keys = Object.keys(row);
    const placeholders = keys.map(() => '?').join(', ');
    stmts.push(
      db.prepare(`${mode} INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`)
        .bind(...keys.map(k => row[k] ?? null))
    );
  }
  await db.batch(stmts);
  return { ok: true, table, imported: rows.length };
}

export async function adminUpdateUser(body: any, db: D1Database) {
  const targetId = String(body.id || '').toLowerCase();
  if (!targetId) return { error: 'id required' };
  const allowed = [
    'program', 'activation_days', 'loading_days', 'transition_days',
    'stabilization_days', 'start_date', 'notes', 'current_target_kcal',
    'maintenance_mode', 'maintenance_diet', 'stab_target_weight', 'target_kg',
    'sex', 'dob', 'age', 'height', 'start_weight', 'act', 'email', 'name',
  ];

  // Auto-set start_date when activating program and no start_date exists
  if (body.program === 1 && !body.start_date) {
    const row = await db.prepare('SELECT start_date FROM users WHERE id = ?').bind(targetId).first<any>();
    if (row && !row.start_date) {
      body.start_date = new Date().toISOString().slice(0, 10);
    }
  }

  const sets: string[] = [];
  const vals: any[] = [];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      sets.push(`${key} = ?`);
      vals.push(body[key]);
    }
  }
  if (!sets.length) return { error: 'nothing to update' };
  vals.push(targetId);
  await db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
  return { ok: true };
}

export async function adminUserCreate(body: any, db: D1Database) {
  const name = String(body.name || '').trim();
  if (!name) return { error: 'name required' };
  const base = name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8) || 'user';
  const rnd = Math.random().toString(36).slice(2, 6);
  const userId = base + '_' + rnd;

  const sex = String(body.sex || 'm').toLowerCase();
  const dob = body.dob || null;
  const age = dob ? dobToAge(dob) : 0;
  const height = parseFloat(body.height) || 0;
  const weight = parseFloat(body.weight) || 0;
  const email = body.email || null;
  const s = sex === 'm' ? 5 : -161;
  const act = 1.55;
  const tdee = height && weight && age
    ? Math.round((10 * weight + 6.25 * height - 5 * age + s) * act)
    : 0;

  const userToken = crypto.randomUUID();
  await db.batch([
    db.prepare(
      `INSERT INTO users (id, name, sex, dob, age, height, start_weight, activity, target_kg,
        current_target_kcal, program, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).bind(userId, name, sex, dob, age, height, weight, act, parseFloat(body.target_kg) || null, tdee, email),
    db.prepare('INSERT INTO auth_tokens (token, user_id, role) VALUES (?, ?, ?)').bind(userToken, userId, 'user'),
  ]);

  return { ok: true, user_id: userId, auth_token: userToken };
}

export async function adminUserDelete(body: any, db: D1Database) {
  const id = String(body.id || '').toLowerCase();
  if (!id) return { error: 'id required' };
  const user = await db.prepare('SELECT id FROM users WHERE id = ?').bind(id).first<any>();
  if (!user) return { error: 'user not found' };
  await db.batch([
    db.prepare('DELETE FROM daily_logs WHERE user_id = ?').bind(id),
    db.prepare('DELETE FROM meal_plans WHERE user_id = ?').bind(id),
    db.prepare('DELETE FROM body_scans WHERE user_id = ?').bind(id),
    db.prepare('DELETE FROM auth_tokens WHERE user_id = ?').bind(id),
    db.prepare('DELETE FROM users WHERE id = ?').bind(id),
  ]);
  return { ok: true };
}
