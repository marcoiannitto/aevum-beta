/**
 * Sync routes: syncRow (upsert daily log), getDays (restore)
 */

export async function syncRow(userId: string, body: any, db: D1Database) {
  // Use client's epoch-ms timestamp so all devices compare on the same basis
  const clientTs = body.updated_at ? Number(body.updated_at) : Date.now();

  await db.prepare(
    `INSERT INTO daily_logs (user_id, day, phase, date, weight, waist,
      serum_am, serum_pm, kcal, protein, fat, carbs, water_ml,
      exercise, exercise_kcal, energy, hunger, sleep, notes, day_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, day) DO UPDATE SET
      phase=excluded.phase, date=excluded.date, weight=excluded.weight,
      waist=excluded.waist, serum_am=excluded.serum_am, serum_pm=excluded.serum_pm,
      kcal=excluded.kcal, protein=excluded.protein, fat=excluded.fat,
      carbs=excluded.carbs, water_ml=excluded.water_ml,
      exercise=excluded.exercise, exercise_kcal=excluded.exercise_kcal,
      energy=excluded.energy, hunger=excluded.hunger, sleep=excluded.sleep,
      notes=excluded.notes, day_json=excluded.day_json,
      updated_at=excluded.updated_at
    WHERE daily_logs.updated_at IS NULL OR daily_logs.updated_at < excluded.updated_at`
  ).bind(
    userId, body.day || 0, body.phase || '', body.date || '',
    body.weight || null, body.waist || null,
    body.serumAM ? 'yes' : '', body.serumPM ? 'yes' : '',
    body.kcal || 0, body.protein || 0, body.fat || 0, body.carbs || 0,
    body.water_ml || 0, body.exercise || '', body.exercise_kcal || 0,
    body.energy || '', body.hunger || '', body.sleep || '',
    body.notes || '', body.day_json || '', clientTs
  ).run();

  return { ok: true };
}

export async function getDays(userId: string, db: D1Database) {
  const rows = await db.prepare(
    'SELECT day, day_json, updated_at, phase FROM daily_logs WHERE user_id = ? ORDER BY day'
  ).bind(userId).all<{ day: number; day_json: string; updated_at: string; phase: string }>();

  return {
    days: rows.results.map(r => ({
      day: r.day,
      day_json: r.day_json || '',
      updated_at: r.updated_at || '',
      phase: r.phase || '',
    })),
  };
}
