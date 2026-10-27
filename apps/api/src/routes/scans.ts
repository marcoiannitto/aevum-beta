/**
 * Body scan routes (admin): save, list, delete.
 */

export async function adminScanSave(body: any, db: D1Database) {
  const userId = String(body.user_id || '');
  if (!userId) return { error: 'user_id required' };
  const scanDate = String(body.scan_date || '');
  if (!scanDate) return { error: 'scan_date required' };
  const scanType = String(body.scan_type || 'InBody');

  const fields = {
    scan_height: body.scan_height ?? null,
    scan_weight: body.scan_weight ?? null,
    scan_bmi: body.scan_bmi ?? null,
    body_fat_pct: body.body_fat_pct ?? null,
    fat_mass: body.fat_mass ?? null,
    smm: body.smm ?? null,
    tbw: body.tbw ?? null,
    scan_bmr: body.scan_bmr ?? null,
    visceral_fat: body.visceral_fat ?? null,
    body_score: body.body_score ?? null,
  };

  const refJson = body.reference_json ? JSON.stringify(body.reference_json) : null;

  // Update existing or insert new
  if (body.id) {
    const existing = await db.prepare('SELECT id FROM body_scans WHERE id = ? AND user_id = ?')
      .bind(body.id, userId).first<any>();
    if (!existing) return { error: 'scan not found' };
    await db.prepare(
      `UPDATE body_scans SET scan_date=?, scan_type=?, scan_height=?, scan_weight=?, scan_bmi=?,
       body_fat_pct=?, fat_mass=?, smm=?, tbw=?, scan_bmr=?, visceral_fat=?, body_score=?,
       reference_json=? WHERE id=? AND user_id=?`
    ).bind(
      scanDate, scanType, fields.scan_height, fields.scan_weight, fields.scan_bmi,
      fields.body_fat_pct, fields.fat_mass, fields.smm, fields.tbw,
      fields.scan_bmr, fields.visceral_fat, fields.body_score,
      refJson, body.id, userId
    ).run();
    return { ok: true, id: body.id };
  }

  // Check max 2 scans per user
  const count = await db.prepare('SELECT COUNT(*) as c FROM body_scans WHERE user_id = ?')
    .bind(userId).first<any>();
  if (count.c >= 2) return { error: 'max 2 scans per user (Day 1 + end of treatment)' };

  const res = await db.prepare(
    `INSERT INTO body_scans (user_id, scan_date, scan_type, scan_height, scan_weight, scan_bmi,
     body_fat_pct, fat_mass, smm, tbw, scan_bmr, visceral_fat, body_score, reference_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    userId, scanDate, scanType, fields.scan_height, fields.scan_weight, fields.scan_bmi,
    fields.body_fat_pct, fields.fat_mass, fields.smm, fields.tbw,
    fields.scan_bmr, fields.visceral_fat, fields.body_score, refJson
  ).run();
  return { ok: true, id: res.meta.last_row_id };
}

export async function adminScanList(body: any, db: D1Database) {
  const userId = String(body.user_id || '');
  if (!userId) return { error: 'user_id required' };
  const rows = await db.prepare(
    'SELECT * FROM body_scans WHERE user_id = ? ORDER BY scan_date ASC'
  ).bind(userId).all<any>();
  return { ok: true, scans: rows.results };
}

export async function adminScanDelete(body: any, db: D1Database) {
  const id = body.id;
  if (!id) return { error: 'id required' };
  const row = await db.prepare('SELECT id FROM body_scans WHERE id = ?').bind(id).first<any>();
  if (!row) return { error: 'scan not found' };
  await db.prepare('DELETE FROM body_scans WHERE id = ?').bind(id).run();
  return { ok: true };
}
