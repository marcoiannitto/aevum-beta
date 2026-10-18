/**
 * Target routes: setStabTarget, saveTargetRow
 */

export async function setStabTarget(userId: string, body: any, db: D1Database) {
  const val = parseFloat(body.stab_target_weight);
  if (!(val > 0)) return { error: 'bad input' };
  const user = await db.prepare(
    'SELECT stab_target_weight FROM users WHERE id = ?'
  ).bind(userId).first<any>();
  if (!user) return { error: 'id not found' };
  // Only set if not already set (one-time lock)
  if (!(parseFloat(user.stab_target_weight) > 0)) {
    await db.prepare('UPDATE users SET stab_target_weight = ? WHERE id = ?').bind(val, userId).run();
  }
  return { ok: true };
}

export async function saveTargetRow(userId: string, body: any, db: D1Database) {
  const fields: string[] = [];
  const vals: any[] = [];
  const map: Record<string, any> = {
    current_target_kcal: body.current_target_kcal,
    prev_target_kcal: body.prev_target_kcal,
    last_review_date: body.last_review_date,
    last_change_reason: body.last_change_reason,
  };
  for (const [k, v] of Object.entries(map)) {
    if (v !== undefined) { fields.push(`${k} = ?`); vals.push(v); }
  }
  if (!fields.length) return { error: 'nothing to update' };
  vals.push(userId);
  await db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run();
  return { ok: true };
}
