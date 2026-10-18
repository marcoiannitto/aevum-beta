/**
 * Compliance engine — derives per-day compliance status.
 * Extracted from v2-api/src/index.js deriveCompliance() + computeStats().
 */

import { ALC_WORDS } from './constants.js';
import { num, isTruthy } from './calories.js';
import type {
  Rule, DayLog, ComplianceDay, ComplianceIssue,
  ComplianceStats, DayJsonMeal, DayJsonItem,
} from './types.js';

// ─── Helpers ─────────────────────────────────────────────────

/** Find the matching rule for a phase/metric/model combo */
export function findRule(
  rules: Rule[],
  phase: string,
  metric: string,
  model: string
): Rule | null {
  const p = (phase || '').toLowerCase().replace('consolidation', 'stabilization');
  let r = rules.find(
    x => x.phase === p && x.metric === metric && (x.model === model || x.model === 'all')
  );
  if (!r && p === 'transition') {
    r = rules.find(
      x => x.phase === 'activation' && x.metric === metric && (x.model === model || x.model === 'all')
    );
  }
  return r ?? null;
}

/** Check a value against a rule's green/amber bands */
export function bandStatus(
  val: number | null,
  rule: Rule | null
): 'green' | 'amber' | 'red' | 'none' {
  if (!rule || val == null || !rule.gated) return 'none';
  if (rule.amber_lo != null && val < rule.amber_lo) return 'red';
  if (rule.amber_hi != null && val > rule.amber_hi) return 'red';
  if (rule.green_lo != null && val < rule.green_lo) return 'amber';
  if (rule.green_hi != null && val > rule.green_hi) return 'amber';
  return 'green';
}

/** Check if a food item is alcohol */
export function isAlcohol(item: DayJsonItem): boolean {
  const n = String(item.name || '').toLowerCase();
  const nt = String(item.note || '').toLowerCase();
  const c = String(item.category || '').toLowerCase();
  if (c === 'alcohol') return true;
  for (const word of ALC_WORDS) {
    if (new RegExp('\\b' + word + '\\b').test(n)) return true;
  }
  return /\balcohol\b/.test(nt);
}

// ─── Core ────────────────────────────────────────────────────

/** Derive per-day compliance from logs + rules */
export function deriveCompliance(
  data: DayLog[],
  rules: Rule[],
  model: string
): ComplianceDay[] {
  return data.map(row => {
    const issues: ComplianceIssue[] = [];
    const phase = String(row.phase || '').toLowerCase().replace('consolidation', 'stabilization');
    const hasData = row.kcal || row.weight || row.notes || row.day_json;
    if (!phase || !hasData) {
      return { day: row.day, date: row.date || '', phase, status: 'empty' as const, issues: [] };
    }

    // Weight logged
    const wr = findRule(rules, phase, 'weight_logged', model);
    if (wr && wr.gated && !row.weight) {
      issues.push({ type: 'weight', sev: 'red', detail: 'No weigh-in' });
    }

    // Serum AM/PM
    const sar = findRule(rules, phase, 'serum_am', model);
    if (sar && sar.gated && !isTruthy(row.serum_am)) {
      issues.push({ type: 'serum_am', sev: 'red', detail: 'Missed AM serum' });
    }
    const spr = findRule(rules, phase, 'serum_pm', model);
    if (spr && spr.gated && !isTruthy(row.serum_pm)) {
      issues.push({ type: 'serum_pm', sev: 'red', detail: 'Missed PM serum' });
    }

    // day_json: alcohol + forbidden food
    let dj: DayJsonMeal[] | null = null;
    if (row.day_json) {
      try {
        const parsed = typeof row.day_json === 'string' ? JSON.parse(row.day_json) : row.day_json;
        dj = Array.isArray(parsed) ? parsed : (parsed.meals || []);
      } catch { /* ignore parse errors */ }
    }
    if (dj) {
      for (const meal of dj) {
        for (const item of (meal.items || [])) {
          if (item.verdict === 'no') {
            if (isAlcohol(item)) {
              const ar = findRule(rules, phase, 'alcohol', model);
              if (ar && ar.gated) {
                issues.push({ type: 'alcohol', sev: 'red', detail: 'Alcohol: ' + (item.name || 'unknown') });
              }
            } else {
              const fr = findRule(rules, phase, 'forbidden_food', model);
              if (fr && fr.gated) {
                issues.push({ type: 'food', sev: 'red', detail: 'Forbidden: ' + (item.name || 'unknown') });
              }
            }
          }
        }
      }
    }

    // Alcohol in notes
    if (row.notes && !issues.some(i => i.type === 'alcohol')) {
      const nl = String(row.notes).toLowerCase();
      for (const word of ALC_WORDS) {
        if (new RegExp('\\b' + word + '\\b').test(nl)) {
          const ar2 = findRule(rules, phase, 'alcohol', model);
          if (ar2 && ar2.gated) {
            issues.push({ type: 'alcohol', sev: 'amber', detail: 'Alcohol in notes' });
          }
          break;
        }
      }
    }

    // Water
    const wtr = findRule(rules, phase, 'water_ml', model);
    if (wtr && wtr.gated && row.water_ml != null) {
      const wml = num(row.water_ml);
      if (wtr.amber_lo != null && wml !== null && wml < wtr.amber_lo) {
        issues.push({ type: 'water', sev: 'red', detail: 'Water: ' + wml + 'ml' });
      } else if (wtr.green_lo != null && wml !== null && wml < wtr.green_lo) {
        issues.push({ type: 'water', sev: 'amber', detail: 'Water low: ' + wml + 'ml' });
      }
    }

    // Kcal
    const kr = findRule(rules, phase, 'kcal', model);
    if (kr && kr.gated && kr.basis !== 'adaptive_kcal' && row.kcal) {
      const kst = bandStatus(num(row.kcal), kr);
      if (kst === 'red') issues.push({ type: 'kcal', sev: 'red', detail: 'Kcal: ' + row.kcal });
      else if (kst === 'amber') issues.push({ type: 'kcal', sev: 'amber', detail: 'Kcal: ' + row.kcal });
    }

    // Protein (macros model only)
    if (model !== 'buckets') {
      const pr = findRule(rules, phase, 'protein', model);
      if (pr && pr.gated && row.protein) {
        const pst = bandStatus(num(row.protein), pr);
        if (pst === 'red') issues.push({ type: 'protein', sev: 'red', detail: 'Protein: ' + row.protein + 'g' });
        else if (pst === 'amber') issues.push({ type: 'protein', sev: 'amber', detail: 'Protein: ' + row.protein + 'g' });
      }
    }

    // Carbs
    const cr = findRule(rules, phase, 'carbs', model);
    if (cr && cr.gated && row.carbs) {
      const cst = bandStatus(num(row.carbs), cr);
      if (cst === 'red') issues.push({ type: 'carbs', sev: 'red', detail: 'Carbs: ' + row.carbs + 'g' });
      else if (cst === 'amber') issues.push({ type: 'carbs', sev: 'amber', detail: 'Carbs: ' + row.carbs + 'g' });
    }

    // Exercise strenuous
    const er = findRule(rules, phase, 'exercise_kcal_warn', model);
    if (er && row.exercise_kcal && num(row.exercise_kcal)! > (er.green_hi || Infinity)) {
      issues.push({ type: 'exercise', sev: 'info', detail: 'Strenuous: ' + row.exercise_kcal + ' kcal' });
    }

    const gated = issues.filter(i => i.sev !== 'info');
    const status = gated.some(i => i.sev === 'red') ? 'red' : gated.some(i => i.sev === 'amber') ? 'amber' : 'green';
    return { day: row.day, date: row.date || '', phase, status, issues };
  });
}

/** Compute aggregate stats from day logs + compliance */
export function computeStats(
  data: DayLog[],
  compliance: ComplianceDay[]
): ComplianceStats {
  const ws = data.filter(d => d.weight).map(d => ({ day: d.day, w: num(d.weight)! }));
  const sw = ws.length ? ws[0].w : null;
  const ew = ws.length ? ws[ws.length - 1].w : null;
  const pk = ws.length ? Math.max(...ws.map(w => w.w)) : null;
  const delta = sw != null && ew != null ? ew - sw : null;
  const scored = compliance.filter(c => c.status !== 'empty');
  const total = scored.length;
  const redFreeDays = scored.filter(c => !c.issues.some(i => i.sev === 'red')).length;
  const pct = total ? Math.round(redFreeDays / total * 100) : 0;
  const exDays = data.filter(d => num(d.exercise_kcal)! > 0).length;
  const kcalRows = data.filter(d => d.kcal);
  const avgKcal = kcalRows.length
    ? Math.round(kcalRows.reduce((s, d) => s + (num(d.kcal) ?? 0), 0) / kcalRows.length)
    : 0;
  return {
    startWeight: sw, endWeight: ew, peakWeight: pk, delta,
    totalDays: data.length, scoredDays: total, redFreeDays,
    compliancePct: pct, exerciseDays: exDays, avgKcal,
  };
}
