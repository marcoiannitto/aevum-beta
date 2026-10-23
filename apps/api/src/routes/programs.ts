/**
 * Program routes: list programs, switch program, admin CRUD, transition history.
 */

// ─── List active programs ──────────────────────────────────

export async function getPrograms(db: D1Database) {
  const rows = await db.prepare(
    'SELECT id, name, description, color, sort_order FROM programs WHERE is_active = 1 ORDER BY sort_order'
  ).all<any>();
  return { programs: rows.results };
}

// ─── Switch user's program ─────────────────────────────────

export async function setProgram(userId: string, body: any, db: D1Database) {
  const programId = String(body.program_id || '').trim();
  if (!programId) return { error: 'program_id required' };

  // Validate program exists and is active
  const prog = await db.prepare(
    'SELECT id, name FROM programs WHERE id = ? AND is_active = 1'
  ).bind(programId).first<any>();
  if (!prog) return { error: 'Program not found or inactive' };

  // Get current program for transition log
  const user = await db.prepare(
    'SELECT program_id FROM users WHERE id = ?'
  ).bind(userId).first<any>();
  const fromProgram = user?.program_id || null;

  if (fromProgram === programId) {
    return { ok: true, message: 'Already on this program' };
  }

  // Get current phase for transition log
  const fromPhase = user?.phase_mode || null;

  // Find the first phase of the new program
  const firstPhase = await db.prepare(
    'SELECT key FROM phases WHERE program_id = ? AND is_program = 1 ORDER BY sort_order LIMIT 1'
  ).bind(programId).first<any>();
  const toPhase = firstPhase?.key || null;

  const now = new Date().toISOString();
  const today = now.slice(0, 10); // YYYY-MM-DD

  // Update user (set program_start_date, never overwrite start_date) + log transition
  await db.batch([
    db.prepare('UPDATE users SET program_id = ?, program_start_date = ? WHERE id = ?').bind(programId, today, userId),
    db.prepare(
      `INSERT INTO program_transitions (user_id, from_program, to_program, from_phase, to_phase, switched_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(userId, fromProgram, programId, fromPhase, toPhase, now),
  ]);

  // Return updated profile + phases for new program
  const phases = await db.prepare(
    'SELECT * FROM phases WHERE program_id = ? ORDER BY sort_order'
  ).bind(programId).all<any>();

  return {
    ok: true,
    program_id: programId,
    start_date: today,  // frontend reads this as program_start_date
    phases: phases.results,
  };
}

// ─── Admin: program CRUD ───────────────────────────────────

export async function adminPrograms(body: any, db: D1Database) {
  const sub = String(body.sub || 'list');

  switch (sub) {
    case 'list': {
      const rows = await db.prepare('SELECT * FROM programs ORDER BY sort_order').all<any>();
      return { programs: rows.results };
    }

    case 'create': {
      const id = String(body.id || '').trim().toLowerCase();
      const name = String(body.name || '').trim();
      if (!id || !name) return { error: 'id and name required' };
      await db.prepare(
        'INSERT INTO programs (id, name, description, color, sort_order) VALUES (?, ?, ?, ?, ?)'
      ).bind(id, name, body.description || '', body.color || '#3E7A6A', body.sort_order || 50).run();
      return { ok: true, id };
    }

    case 'update': {
      const id = String(body.id || '').trim();
      if (!id) return { error: 'id required' };
      const sets: string[] = [];
      const vals: any[] = [];
      for (const key of ['name', 'description', 'color', 'sort_order', 'is_active']) {
        if (body[key] !== undefined) {
          sets.push(`${key} = ?`);
          vals.push(body[key]);
        }
      }
      if (!sets.length) return { error: 'nothing to update' };
      vals.push(id);
      await db.prepare(`UPDATE programs SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
      return { ok: true };
    }

    case 'delete': {
      const id = String(body.id || '').trim();
      if (!id) return { error: 'id required' };
      // Soft delete (deactivate)
      await db.prepare('UPDATE programs SET is_active = 0 WHERE id = ?').bind(id).run();
      return { ok: true };
    }

    default:
      return { error: 'Unknown sub action: ' + sub };
  }
}

// ─── Admin: view program transitions for a user ────────────

export async function adminProgramTransitions(body: any, db: D1Database) {
  const userId = String(body.user_id || '').trim();
  if (!userId) return { error: 'user_id required' };

  const rows = await db.prepare(
    `SELECT pt.*, p1.name as from_program_name, p2.name as to_program_name
     FROM program_transitions pt
     LEFT JOIN programs p1 ON pt.from_program = p1.id
     LEFT JOIN programs p2 ON pt.to_program = p2.id
     WHERE pt.user_id = ?
     ORDER BY pt.switched_at DESC`
  ).bind(userId).all<any>();

  return { transitions: rows.results };
}
