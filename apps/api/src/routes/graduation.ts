/**
 * Graduation route — dashboard endpoint for compliance review.
 * Imports cross-route functions (getProfile, getRules) and shared compliance engine.
 */

import { deriveCompliance, computeStats, resetDayCount } from '@aevum/shared';
import { getProfile } from './profile.js';
import { getRules } from './rules.js';

export async function graduation(
  userId: string,
  body: any,
  db: D1Database,
  isAdmin: boolean
) {
  const sub = String(body.sub || '').trim();

  // sub=clients: list all profiles (admin only)
  if (sub === 'clients') {
    if (!isAdmin) return { error: 'admin only' };
    const rows = await db.prepare('SELECT id, name FROM users').all<any>();
    return { clients: rows.results };
  }

  // sub=full or sub=reset
  if (sub === 'full' || sub === 'reset') {
    const targetId = isAdmin && body.id ? String(body.id).toLowerCase() : userId;
    const prof = await getProfile(targetId, db);
    const rulesResp = await getRules(targetId, db);

    const logRows = await db.prepare(
      'SELECT * FROM daily_logs WHERE user_id = ? ORDER BY day'
    ).bind(targetId).all<any>();

    let data: any[] = logRows.results.map((r: any) => ({
      day: r.day,
      phase: r.phase,
      date: r.date,
      weight: r.weight,
      waist: r.waist,
      serum_am: r.serum_am,
      serum_pm: r.serum_pm,
      kcal: r.kcal,
      protein: r.protein,
      fat: r.fat,
      carbs: r.carbs,
      water_ml: r.water_ml,
      exercise: r.exercise,
      exercise_kcal: r.exercise_kcal,
      energy: r.energy,
      hunger: r.hunger,
      sleep: r.sleep,
      notes: r.notes,
      day_json: r.day_json,
    }));

    if (sub === 'reset') {
      const rd = resetDayCount(prof.profile || {});
      data = data.filter((r: any) => (r.day || 0) <= rd);
    }

    const model = rulesResp.model || 'buckets';
    const rules = rulesResp.rules || [];
    const compliance = deriveCompliance(data as any, rules, model);
    const stats = computeStats(data as any, compliance);

    return { profile: prof.profile, model, data, rules, compliance, stats };
  }

  // Save maintenance mode / diet (no sub)
  const mode = String(body.mode || '').trim().toLowerCase();
  const diet = String(body.diet || '').trim().toLowerCase();
  if ((mode || diet) && !sub) {
    if (mode && mode !== 'maintain' && mode !== 'cut') return { error: 'invalid mode' };
    if (diet && diet !== 'keto' && diet !== 'high_protein' && diet !== 'balanced')
      return { error: 'invalid diet' };

    const sets: string[] = [];
    const vals: any[] = [];
    if (mode) { sets.push('maintenance_mode = ?'); vals.push(mode); }
    if (diet) { sets.push('maintenance_diet = ?'); vals.push(diet); }
    vals.push(userId);
    await db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    return { ok: true, mode: mode || '', diet: diet || '' };
  }

  return { error: 'unknown graduation sub: ' + sub };
}
