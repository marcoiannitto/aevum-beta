/**
 * Meal routes: getMealPlan, mealEngine (calc, config, validate, save, delete, copy, ingredients, catered, users)
 */

import { ME } from '@aevum/shared';

export async function getMealPlan(userId: string, db: D1Database) {
  const rows = await db.prepare(
    'SELECT day, meal, recipe, kcal, protein, fat, carbs, meal_type, meal_slot, components_json FROM meal_plans WHERE user_id = ? ORDER BY day'
  ).bind(userId).all<any>();
  return { plan: rows.results };
}

export async function mealEngine(userId: string, body: any, db: D1Database) {
  const sub = String(body.sub || '');

  // ─── plan ─────────────────────────────────────────────────
  if (sub === 'plan') {
    return getMealPlan(userId, db);
  }

  // ─── calc ─────────────────────────────────────────────────
  if (sub === 'calc') {
    const sex = String(body.sex || 'm').toLowerCase();
    const height = parseFloat(body.height);
    const weight = parseFloat(body.weight);
    if (!height || !weight) return { error: 'height and weight required' };

    const ibw = sex === 'f' ? ME.IBW_WOMEN(height) : ME.IBW_MEN(height);
    const p_daily = ME.P_PER_KG * ibw;
    const p_food = p_daily - ME.SUPPLEMENT.protein_g;
    const c_daily = weight < ME.C_BW_THRESHOLD ? ME.C_LOW_BW : ME.C_DAILY;
    const kcal_food = 4 * p_food + 4 * c_daily;
    const kcal_total = kcal_food + ME.SUPPLEMENT.kcal;
    const p_per_meal = Math.round(p_food / ME.MAIN_MEAL_SLOTS.length);
    const c_per_meal = Math.round(c_daily / ME.MAIN_MEAL_SLOTS.length);

    return {
      ibw: Math.round(ibw * 10) / 10,
      p_daily: Math.round(p_daily),
      p_food: Math.round(p_food),
      c_daily,
      f_daily: 0,
      kcal_estimate: Math.round(kcal_total),
      supplement: ME.SUPPLEMENT,
      per_meal: { protein_g: p_per_meal, carbs_g: c_per_meal, fat_g: 0 },
      activation_days: parseInt(body.activation_days) || ME.ACTIVATION_DEFAULT_DAYS,
      slots: ME.SLOTS,
    };
  }

  // ─── config ───────────────────────────────────────────────
  if (sub === 'config') {
    return {
      proteins: ME.PROTEINS,
      vegetables: ME.VEGETABLES,
      fruit: ME.FRUIT,
      cooking_methods: ME.COOKING_METHODS,
      seasonings: ME.SEASONINGS,
      snack_items: ME.SNACK_ITEMS,
      supplement: ME.SUPPLEMENT,
      slots: ME.SLOTS,
      fruit_cap_g: ME.FRUIT_CAP_G,
      veg_range: [ME.VEG_MIN_G, ME.VEG_MAX_G],
      plan_days: ME.PLAN_DAYS,
    };
  }

  // ─── validate ─────────────────────────────────────────────
  if (sub === 'validate') {
    const flags: Array<{ item: string; issue: string }> = [];

    for (const item of (body.items || [])) {
      const name = String(item.name || '').toLowerCase();
      const type = String(item.type || '');

      if (type === 'protein' && ME.PROTEINS.not_allowed.some((p: string) => name.includes(p.toLowerCase())))
        flags.push({ item: item.name, issue: 'not allowed in Activation' });

      if (type === 'vegetable' && ME.VEGETABLES.not_allowed.some((v: string) => name.includes(v.toLowerCase())))
        flags.push({ item: item.name, issue: 'starchy/not allowed' });

      if (type === 'fruit') {
        if (ME.FRUIT.not_allowed.some((f: string) => name.includes(f.toLowerCase())))
          flags.push({ item: item.name, issue: 'too much sugar' });
        if ((+item.grams || 0) > ME.FRUIT_CAP_G)
          flags.push({ item: item.name, issue: 'over ' + ME.FRUIT_CAP_G + 'g fruit cap' });
      }

      if (item.cooking_method && ME.COOKING_METHODS.not_allowed.some((m: string) =>
        String(item.cooking_method).toLowerCase().includes(m.toLowerCase())))
        flags.push({ item: item.name, issue: 'cooking method not allowed (uses fat)' });
    }

    if ((+(body.macros || {}).fat || 0) > 0)
      flags.push({ item: 'total', issue: 'Activation = zero added fat' });

    return { valid: flags.length === 0, flags };
  }

  // ─── save ─────────────────────────────────────────────────
  if (sub === 'save') {
    const rows = body.rows || [];
    if (!rows.length) return { error: 'rows required' };

    const days = [...new Set(rows.map((r: any) => +r.day))] as number[];
    const delStmts = days.map((d: number) =>
      db.prepare('DELETE FROM meal_plans WHERE user_id = ? AND day = ?').bind(userId, d)
    );
    const insStmts = rows.map((r: any) =>
      db.prepare(
        'INSERT INTO meal_plans (user_id, day, meal, recipe, kcal, protein, fat, carbs, meal_type, meal_slot, components_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        userId, +r.day, r.meal || '', r.recipe || '',
        Math.round(+r.kcal || 0), Math.round(+r.protein || 0),
        Math.round(+r.fat || 0), Math.round(+r.carbs || 0),
        r.meal_type || 'recipe', r.meal_slot || '', r.components_json || ''
      )
    );
    await db.batch([...delStmts, ...insStmts]);
    return { ok: true, saved: rows.length };
  }

  // ─── delete ───────────────────────────────────────────────
  if (sub === 'delete') {
    const day = body.day;
    if (day === undefined) return { error: 'day required' };
    const dayEnd = body.day_end !== undefined ? +body.day_end : +day;
    await db.prepare(
      'DELETE FROM meal_plans WHERE user_id = ? AND day >= ? AND day <= ?'
    ).bind(userId, +day, dayEnd).run();
    return { ok: true };
  }

  // ─── copy ─────────────────────────────────────────────────
  if (sub === 'copy') {
    const fromDay = body.from_day;
    const toDay = body.to_day;
    if (fromDay === undefined || toDay === undefined)
      return { error: 'from_day and to_day required' };

    const src = await db.prepare(
      'SELECT meal, recipe, kcal, protein, fat, carbs, meal_type, meal_slot, components_json FROM meal_plans WHERE user_id = ? AND day = ?'
    ).bind(userId, +fromDay).all<any>();
    if (!src.results.length) return { error: 'no meals on source day' };

    const stmts: D1PreparedStatement[] = [
      db.prepare('DELETE FROM meal_plans WHERE user_id = ? AND day = ?').bind(userId, +toDay),
    ];
    for (const r of src.results) {
      stmts.push(
        db.prepare(
          'INSERT INTO meal_plans (user_id, day, meal, recipe, kcal, protein, fat, carbs, meal_type, meal_slot, components_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          userId, +toDay, r.meal, r.recipe, r.kcal, r.protein, r.fat, r.carbs,
          r.meal_type || 'recipe', r.meal_slot || '', r.components_json || ''
        )
      );
    }
    await db.batch(stmts);
    return { ok: true, copied: src.results.length };
  }

  // ─── ingredients ──────────────────────────────────────────
  if (sub === 'ingredients') {
    const rows = await db.prepare('SELECT * FROM ingredients').all<any>();
    return { ingredients: rows.results };
  }

  // ─── catered ──────────────────────────────────────────────
  if (sub === 'catered') {
    const rows = await db.prepare('SELECT * FROM catered_menu ORDER BY category, name').all<any>();
    return { catered_menu: rows.results };
  }

  // ─── users (for meal-plan assignment UI) ──────────────────
  if (sub === 'users') {
    const rows = await db.prepare('SELECT id, name FROM users').all<any>();
    return { users: rows.results };
  }

  return { error: 'unknown mealengine sub: ' + sub };
}
