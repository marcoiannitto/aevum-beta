/**
 * Profile routes: getProfile, completeProfile, updateProfile
 */

import { dobToAge } from '@aevum/shared';

export async function getProfile(userId: string, db: D1Database) {
  const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<any>();
  if (!row) return { profile: null };
  return {
    profile: {
      id: row.id,
      name: row.name,
      email: row.email || '',
      sex: row.sex || '',
      dob: row.dob || '',
      age: row.dob ? dobToAge(row.dob) : row.age,
      target_kg: row.target_kg,
      start_weight: row.start_weight,
      weight: row.start_weight,
      start_date: row.start_date || '',
      height: row.height,
      act: row.activity || '',
      activation_days: row.activation_days,
      loading_days: row.loading_days,
      transition_days: row.transition_days,
      stabilization_days: row.stabilization_days,
      stab_target_weight: row.stab_target_weight,
      maint_target_weight: row.maint_target_weight || null,
      current_target_kcal: row.current_target_kcal,
      prev_target_kcal: row.prev_target_kcal,
      last_review_date: row.last_review_date || '',
      last_change_reason: row.last_change_reason || '',
      maintenance_mode: row.maintenance_mode || '',
      maintenance_diet: row.maintenance_diet || '',
      phase_mode: row.phase_mode || '',
      program: !!row.program,
      notes: row.notes || '',
    },
  };
}

export async function completeProfile(userId: string, body: any, db: D1Database) {
  const sex = String(body.sex || '').toLowerCase();
  if (sex !== 'm' && sex !== 'f') return { error: 'sex must be m or f' };

  const dob = String(body.dob || '').trim();
  const age = dob ? dobToAge(dob) : (parseInt(body.age) || 0);
  const height = parseFloat(body.height) || 0;
  const weight = parseFloat(body.weight) || 0;
  const act = parseFloat(body.act) || 1.55;
  const target_kg = parseFloat(body.target_kg) || null;

  if (!age || !height || !weight) return { error: 'dob/age, height, weight required' };

  const s = sex === 'm' ? 5 : -161;
  const tdee = Math.round((10 * weight + 6.25 * height - 5 * age + s) * act);

  await db.prepare(
    `UPDATE users SET sex=?, dob=?, age=?, height=?, start_weight=?, activity=?,
     target_kg=?, current_target_kcal=? WHERE id=?`
  ).bind(sex, dob || null, age, height, weight, act, target_kg, tdee, userId).run();

  return { ok: true, current_target_kcal: tdee };
}

export async function updateProfile(userId: string, body: any, db: D1Database) {
  const allowed = ['name', 'sex', 'dob', 'height', 'target_kg', 'act', 'phase_mode'];
  const sets: string[] = [];
  const vals: any[] = [];

  for (const key of allowed) {
    if (body[key] !== undefined && body[key] !== '') {
      if (key === 'sex') {
        const s = String(body.sex).toLowerCase();
        if (s !== 'm' && s !== 'f') continue;
        sets.push('sex = ?'); vals.push(s);
      } else if (key === 'dob') {
        sets.push('dob = ?'); vals.push(body.dob);
        sets.push('age = ?'); vals.push(dobToAge(body.dob));
      } else if (key === 'act') {
        sets.push('activity = ?'); vals.push(parseFloat(body.act));
      } else if (key === 'height') {
        sets.push('height = ?'); vals.push(parseFloat(body.height));
      } else if (key === 'target_kg') {
        sets.push('target_kg = ?'); vals.push(parseFloat(body.target_kg));
      } else if (key === 'name') {
        sets.push('name = ?'); vals.push(String(body.name).trim());
      } else if (key === 'phase_mode') {
        const pm = String(body.phase_mode).trim();
        if (['maintenance', 'recomposition'].includes(pm)) {
          sets.push('phase_mode = ?'); vals.push(pm);
        }
      }
    }
  }

  if (!sets.length) return { error: 'nothing to update' };

  vals.push(userId);
  await db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();

  // Recompute TDEE only when body-comp fields changed (not phase_mode or name alone)
  const tdeeFields = ['sex', 'dob', 'height', 'target_kg', 'activity'];
  const bodyChanged = sets.some(s => tdeeFields.some(f => s.startsWith(f + ' ')));

  if (bodyChanged) {
    const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first<any>();
    if (row && row.sex && row.height && (row.dob || row.age) && row.start_weight) {
      const age = row.dob ? dobToAge(row.dob) : row.age;
      const act = parseFloat(row.activity) || 1.55;
      const s = row.sex === 'm' ? 5 : -161;
      const tw = parseFloat(row.target_kg) || parseFloat(row.start_weight);
      const tdee = Math.round((10 * tw + 6.25 * row.height - 5 * age + s) * act);
      await db.prepare('UPDATE users SET current_target_kcal = ? WHERE id = ?').bind(tdee, userId).run();
    }
  }

  return await getProfile(userId, db);
}
