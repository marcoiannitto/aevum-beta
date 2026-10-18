/**
 * Rules routes — resolves per-user rules with model filtering,
 * per_kg_target_weight scaling, and phase inheritance.
 */

export async function getRules(userId: string, db: D1Database) {
  let model = 'buckets';
  let targetWeight: number | null = null;

  const user = await db.prepare(
    'SELECT activation_model, stab_target_weight, target_kg, start_weight FROM users WHERE id = ?'
  ).bind(userId).first<any>();

  if (user) {
    const m = String(user.activation_model || '').toLowerCase();
    if (m === 'macros' || m === 'buckets') model = m;
    targetWeight = user.stab_target_weight || user.target_kg || user.start_weight || null;
  }

  const rows = await db.prepare('SELECT * FROM rules').all<any>();
  const maintDiets = ['keto', 'high_protein', 'balanced'];
  const out: any[] = [];

  for (const r of rows.results) {
    const rowModel = String(r.model || 'all').toLowerCase();
    if (rowModel !== 'all' && rowModel !== model && !maintDiets.includes(rowModel)) continue;

    let target: number | null = r.value;
    let bands = {
      green_lo: r.green_lo as number | null,
      green_hi: r.green_hi as number | null,
      amber_lo: r.amber_lo as number | null,
      amber_hi: r.amber_hi as number | null,
    };
    const basis = String(r.basis || 'fixed').toLowerCase();

    if (basis === 'per_kg_target_weight' && targetWeight) {
      const mult = (x: number | null) => x == null ? null : Math.round(x * (targetWeight as number));
      target = mult(r.value);
      bands = {
        green_lo: mult(r.green_lo),
        green_hi: mult(r.green_hi),
        amber_lo: mult(r.amber_lo),
        amber_hi: mult(r.amber_hi),
      };
    } else if (basis === 'adaptive_kcal') {
      target = null;
    }

    out.push({
      phase: r.phase, model: rowModel, metric: r.metric, basis,
      target, green_lo: bands.green_lo, green_hi: bands.green_hi,
      amber_lo: bands.amber_lo, amber_hi: bands.amber_hi,
      gated: String(r.gated || '').toLowerCase() !== 'no',
      unit: r.unit || '',
    });
  }

  // Registry-driven rule inheritance: phases with inherits_rules_from copy from their parent
  // Note: original D1 schema uses `key` as the column name in phases table
  try {
    const phases = await db.prepare(
      'SELECT key, inherits_rules_from FROM phases WHERE inherits_rules_from IS NOT NULL'
    ).all<any>();
    for (const ph of (phases.results || [])) {
      if (!out.some(x => x.phase === ph.key)) {
        out.filter(x => x.phase === ph.inherits_rules_from)
          .forEach(x => out.push({ ...x, phase: ph.key }));
      }
    }
  } catch (_e) {
    // Fallback if phases table doesn't exist yet (pre-migration)
    if (!out.some(x => x.phase === 'transition')) {
      out.filter(x => x.phase === 'activation')
        .forEach(x => out.push({ ...x, phase: 'transition' }));
    }
    if (!out.some(x => x.phase === 'maintenance')) {
      out.filter(x => x.phase === 'stabilization')
        .forEach(x => out.push({ ...x, phase: 'maintenance' }));
    }
  }

  return { model, target_weight: targetWeight, rules: out };
}
