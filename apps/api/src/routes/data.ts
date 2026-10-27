/**
 * Data routes — read-only lookups for config, phases, messages,
 * recipes, fitness, foods, and policy.
 */

// ─── Config ──────────────────────────────────────────────────

export async function getConfig(db: D1Database) {
  const rows = await db.prepare('SELECT key, value FROM config').all<any>();
  return { config: rows.results };
}

// ─── Phases ──────────────────────────────────────────────────

export async function getPhases(db: D1Database) {
  const rows = await db.prepare('SELECT * FROM phases ORDER BY sort_order').all<any>();
  return { phases: rows.results };
}

// ─── Phase Transitions ──────────────────────────────────────

export async function getPhaseTransitions(userId: string, db: D1Database) {
  const rows = await db.prepare(
    'SELECT from_phase, to_phase, day, date, reason FROM phase_transitions WHERE user_id = ? ORDER BY date'
  ).bind(userId).all<any>();
  return { transitions: rows.results };
}

// ─── Messages ────────────────────────────────────────────────

export async function getMessages(db: D1Database) {
  const rows = await db.prepare(
    'SELECT id, trigger, enabled, phase, priority, title, body, badge, frequency FROM messages ORDER BY priority DESC'
  ).all<any>();
  return { messages: rows.results };
}

// ─── Recipes ─────────────────────────────────────────────────

export async function getRecipes(db: D1Database) {
  const rows = await db.prepare('SELECT * FROM recipes').all<any>();
  return {
    recipes: rows.results.map((r: any) => ({
      name: r.name,
      protein: r.protein,
      cuisine: r.cuisine,
      phase: r.phase || '',
      kcal: r.kcal || 0,
      protein_g: r.protein_g || 0,
      fat_g: r.fat_g || 0,
      carbs_g: r.carbs_g || 0,
      ingredients: (r.ingredients || '').split('||').map((s: string) => s.trim()).filter(Boolean),
      steps: (r.steps || '').split('||').map((s: string) => s.trim()).filter(Boolean),
    })),
  };
}

// ─── Fitness ─────────────────────────────────────────────────

export async function getFitness(db: D1Database) {
  const mv = await db.prepare('SELECT * FROM movements').all<any>();
  const wk = await db.prepare('SELECT * FROM workouts ORDER BY workout_id, sort_order').all<any>();
  return { movements: mv.results, workouts: wk.results };
}

// ─── Foods ───────────────────────────────────────────────────

export async function getFoods(body: any, db: D1Database) {
  const want = String(body.phase || '').trim().toLowerCase();
  let rows: any;

  if (want) {
    rows = await db.prepare('SELECT * FROM foods WHERE phase = ?').bind(want).all<any>();
    // transition inherits activation
    if (want === 'transition' && rows.results.length === 0) {
      rows = await db.prepare('SELECT * FROM foods WHERE phase = ?').bind('activation').all<any>();
      rows.results = rows.results.map((r: any) => ({ ...r, phase: 'transition' }));
    }
  } else {
    rows = await db.prepare('SELECT * FROM foods').all<any>();
    // add transition inheriting activation if none exist
    const hasTransition = rows.results.some((r: any) => r.phase === 'transition');
    if (!hasTransition) {
      const actRows = rows.results.filter((r: any) => r.phase === 'activation');
      rows.results.push(...actRows.map((r: any) => ({ ...r, phase: 'transition' })));
    }
  }

  return {
    foods: rows.results.map((r: any) => ({
      phase: r.phase, category: r.category, subcategory: r.subcategory,
      item: r.item, verdict: r.verdict, cap_g: r.cap_g, note: r.note,
    })),
  };
}

// ─── Policy ──────────────────────────────────────────────────

export async function getPolicy(body: any, db: D1Database) {
  const want = String(body.phase || '').trim().toLowerCase();
  let rows: any;

  if (want) {
    rows = await db.prepare('SELECT phase, rules_text FROM policy WHERE phase = ?').bind(want).all<any>();
    if (rows.results.length === 0 && want === 'transition') {
      rows = await db.prepare('SELECT phase, rules_text FROM policy WHERE phase = ?').bind('activation').all<any>();
      rows.results = rows.results.map((r: any) => ({ ...r, phase: 'transition' }));
    }
    if (rows.results.length === 0 && want === 'maintenance') {
      rows = await db.prepare('SELECT phase, rules_text FROM policy WHERE phase = ?').bind('stabilization').all<any>();
      rows.results = rows.results.map((r: any) => ({ ...r, phase: 'maintenance' }));
    }
  } else {
    rows = await db.prepare('SELECT phase, rules_text FROM policy').all<any>();
    if (!rows.results.some((r: any) => r.phase === 'transition')) {
      const act = rows.results.find((r: any) => r.phase === 'activation');
      if (act) rows.results.push({ phase: 'transition', rules_text: act.rules_text });
    }
  }

  return { policy: rows.results };
}

// ─── Policy text helper (used by AI proxy routes) ────────────

export async function getPolicyText(phase: string, db: D1Database): Promise<string> {
  const want = String(phase || '').trim().toLowerCase();
  if (!want) return '';

  const row = await db.prepare('SELECT rules_text FROM policy WHERE phase = ?').bind(want).first<any>();
  if (row) return row.rules_text;

  const fallback = want === 'transition' ? 'activation'
    : (want === 'maintenance' ? 'stabilization' : null);
  if (fallback) {
    const fb = await db.prepare('SELECT rules_text FROM policy WHERE phase = ?').bind(fallback).first<any>();
    if (fb) return fb.rules_text;
  }

  return '';
}
