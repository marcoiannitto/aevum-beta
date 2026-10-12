#!/usr/bin/env node
/**
 * AEVUM V1 → V2 Migration Script
 * Reads the exported Google Sheet data and imports into D1 via the v2 API.
 *
 * Usage:
 *   node migrate.js <path-to-sheet-export> <admin-token>
 *
 * The sheet export is the text file with "## Sheet name:" sections.
 * The admin token is your D1 admin auth token.
 */

const fs = require('fs');
const API = 'https://aevum-api-v2.marco-iannitto.workers.dev';

// ─── Parse the multi-sheet text file ───────────────────────────
// Handles multiline quoted CSV fields (e.g. day_json with embedded newlines)
function parseSheets(text) {
  const sheets = {};
  // Split by sheet headers first
  const sections = text.split(/^## Sheet name:\s*/m).slice(1);

  for (const section of sections) {
    const nlIdx = section.indexOf('\n');
    const sheetName = section.slice(0, nlIdx).trim();
    const csvBody = section.slice(nlIdx + 1);

    // Parse CSV body with multiline support
    const rows = parseCSV(csvBody);
    if (rows.length < 2) { sheets[sheetName] = []; continue; }

    const headers = rows[0];
    sheets[sheetName] = rows.slice(1).map(fields => {
      const row = {};
      headers.forEach((h, i) => { row[h] = fields[i] !== undefined ? fields[i] : ''; });
      return row;
    });
  }
  return sheets;
}

// Full RFC-4180 CSV parser: handles quoted fields spanning multiple lines
function parseCSV(text) {
  const rows = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    // Skip lines that look like sheet headers (shouldn't happen after split, but safety)
    if (text.startsWith('## Sheet name:', i)) break;

    const { fields, nextPos } = parseCSVRow(text, i);
    i = nextPos;
    // Skip completely empty lines
    if (fields.length === 1 && fields[0] === '') continue;
    rows.push(fields);
  }
  return rows;
}

function parseCSVRow(text, start) {
  const fields = [];
  let i = start;
  const len = text.length;

  while (i < len) {
    if (text[i] === '\n' || text[i] === '\r') {
      // End of row
      if (text[i] === '\r' && text[i + 1] === '\n') i += 2;
      else i++;
      break;
    }

    if (text[i] === '"') {
      // Quoted field: can span multiple lines
      let val = '';
      i++; // skip opening quote
      while (i < len) {
        if (text[i] === '"' && text[i + 1] === '"') {
          val += '"';
          i += 2;
        } else if (text[i] === '"') {
          i++; // skip closing quote
          break;
        } else {
          val += text[i];
          i++;
        }
      }
      fields.push(val);
      // Skip comma or end of line after quoted field
      if (i < len && text[i] === ',') i++;
    } else {
      // Unquoted field
      let end = i;
      while (end < len && text[end] !== ',' && text[end] !== '\n' && text[end] !== '\r') end++;
      fields.push(text.slice(i, end));
      i = end;
      if (i < len && text[i] === ',') i++;
    }
  }
  return { fields, nextPos: i };
}

// ─── API caller ────────────────────────────────────────────────
async function callAPI(action, body, token) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'https://beta.niramaya.sg' },
    body: JSON.stringify({ action, token, ...body })
  });
  const data = await res.json();
  if (data.error) throw new Error(`API error (${action}): ${data.error}`);
  return data;
}

// ─── Transform V1 → V2 schemas ────────────────────────────────

function transformUsers(profileRows) {
  return profileRows.filter(r => r.id && r.id.trim()).map(r => ({
    id: r.id,
    name: r.name,
    target_kg: num(r.target_kg),
    start_weight: num(r.start_weight),
    start_date: r.start_date || null,
    height: num(r.height),
    activation_days: num(r.activation_days),
    activation_model: r.activation_model || 'buckets',
    stab_target_weight: num(r.stab_target_weight),
    current_target_kcal: num(r.current_target_kcal),
    prev_target_kcal: num(r.prev_target_kcal),
    last_review_date: r.last_review_date || null,
    last_change_reason: r.last_change_reason || null,
    maintenance_mode: r.maintenance_mode || null,
    maintenance_diet: r.maintenance_diet || null,
    program: r.program ? parseInt(r.program) : 0,
    notes: r.notes || null,
    email: null  // will be set when users log in with Google
  }));
}

function transformDailyLogs(dataRows) {
  return dataRows.filter(r => r.id && r.day).map(r => ({
    user_id: r.id,
    day: parseInt(r.day),
    phase: r.phase || null,
    date: r.date || null,
    weight: num(r.weight),
    waist: num(r.waist),
    serum_am: r.serumAM || null,
    serum_pm: r.serumPM || null,
    kcal: num(r.kcal),
    protein: num(r.protein),
    fat: num(r.fat),
    carbs: num(r.carbs),
    water_ml: num(r.water_ml),
    exercise: r.exercise || null,
    exercise_kcal: num(r.exercise_kcal),
    energy: r.energy || null,
    hunger: r.hunger || null,
    sleep: r.sleep || null,
    notes: r.notes || null,
    day_json: r.day_json || null
  }));
}

function transformMealPlans(mealRows) {
  // Only import rows that actually have a meal (skip blank placeholders)
  return mealRows
    .filter(r => r.meal && r.meal.trim())
    .map(r => ({
      user_id: r.id,
      day: parseInt(r.day),
      meal: r.meal,
      recipe: r.recipe || null,
      kcal: num(r.kcal),
      protein: num(r.protein),
      fat: num(r.fat),
      carbs: num(r.carbs)
    }));
}

function transformRecipes(rows) {
  return rows.filter(r => r.name && r.name.trim()).map(r => ({
    name: r.name,
    protein: r.protein || null,
    cuisine: r.cuisine || null,
    phase: r.phase || null,
    kcal: num(r.kcal),
    protein_g: num(r.protein_g),
    fat_g: num(r.fat_g),
    carbs_g: num(r.carbs_g),
    ingredients: r.ingredients || null,
    steps: r.steps || null
  }));
}

function transformMessages(rows) {
  return rows.filter(r => r.id && r.id.trim()).map(r => ({
    id: r.id,
    trigger: r.trigger,
    enabled: r.enabled || 'yes',
    phase: r.phase || null,
    priority: parseInt(r.priority) || 0,
    title: r.title || null,
    body: r.body || null,
    badge: r.badge || null,
    frequency: r.frequency || 'daily'
  }));
}

function transformMovements(rows) {
  return rows.filter(r => r.id && r.id.trim()).map(r => ({
    id: r.id,
    name: r.name,
    phase: r.phase || null,
    equipment: r.equipment || null,
    video_url: r.video_url || null,
    cues: r.cues || null,
    mistake: r.mistake || null
  }));
}

function transformWorkouts(rows) {
  return rows.filter(r => r.workout_id && r.workout_id.trim()).map(r => ({
    workout_id: r.workout_id,
    workout_name: r.workout_name || null,
    phase: r.phase || null,
    duration_min: parseInt(r.duration_min) || null,
    sort_order: parseInt(r.order) || 0,
    movement_id: r.movement_id || null,
    sets: parseInt(r.sets) || 0,
    reps: parseInt(r.reps) || 0,
    rest_sec: parseInt(r.rest_sec) || 0
  }));
}

function transformRules(rows) {
  return rows.filter(r => r.phase && r.metric).map(r => ({
    phase: r.phase,
    model: r.model || 'all',
    metric: r.metric,
    basis: r.basis || 'fixed',
    value: num(r.value),
    green_lo: num(r.green_lo),
    green_hi: num(r.green_hi),
    amber_lo: num(r.amber_lo),
    amber_hi: num(r.amber_hi),
    gated: r.gated || 'yes',
    unit: r.unit || null
  }));
}

function transformFoods(rows) {
  return rows.filter(r => r.item && r.item.trim()).map(r => ({
    phase: r.phase,
    category: r.category || null,
    subcategory: r.subcategory || null,
    item: r.item,
    verdict: r.verdict || 'yes',
    cap_g: num(r.cap_g),
    note: r.note || null
  }));
}

function transformPolicy(rows) {
  return rows.filter(r => r.phase && r.phase.trim()).map(r => ({
    phase: r.phase,
    rules_text: r.rules_text
  }));
}

function transformConfig(rows) {
  return rows.filter(r => r.key && r.key.trim()).map(r => ({
    key: r.key,
    value: r.value || null
  }));
}

function num(v) {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  const [,, filePath, token] = process.argv;
  if (!filePath || !token) {
    console.error('Usage: node migrate.js <sheet-export-file> <admin-token>');
    process.exit(1);
  }

  const text = fs.readFileSync(filePath, 'utf-8');
  const sheets = parseSheets(text);

  console.log('Parsed sheets:', Object.keys(sheets).map(k => `${k} (${sheets[k].length} rows)`).join(', '));

  // ─── 1. Reference tables via admin_seed (DELETE + INSERT) ───
  const refTables = [
    { sheet: 'Recipes',   table: 'recipes',   transform: transformRecipes },
    { sheet: 'Messages',  table: 'messages',   transform: transformMessages },
    { sheet: 'Movements', table: 'movements',  transform: transformMovements },
    { sheet: 'Workouts',  table: 'workouts',   transform: transformWorkouts },
    { sheet: 'Rules',     table: 'rules',      transform: transformRules },
    { sheet: 'Foods',     table: 'foods',      transform: transformFoods },
    { sheet: 'Policy',    table: 'policy',     transform: transformPolicy },
    { sheet: 'Config',    table: 'config',     transform: transformConfig },
  ];

  for (const { sheet, table, transform } of refTables) {
    if (!sheets[sheet] || !sheets[sheet].length) {
      console.log(`⏩ ${table}: no data in sheet "${sheet}"`);
      continue;
    }
    const rows = transform(sheets[sheet]);
    console.log(`📦 Seeding ${table}: ${rows.length} rows...`);
    try {
      const result = await callAPI('admin_seed', { table, rows }, token);
      console.log(`   ✅ ${table}: ${result.inserted} inserted`);
    } catch (e) {
      console.error(`   ❌ ${table}: ${e.message}`);
    }
  }

  // ─── 2. Per-user tables via admin_import (INSERT OR REPLACE) ─
  // Users
  if (sheets.Profile) {
    const users = transformUsers(sheets.Profile);
    console.log(`📦 Importing users: ${users.length} rows...`);
    try {
      const result = await callAPI('admin_import', { table: 'users', rows: users }, token);
      console.log(`   ✅ users: ${result.imported} imported`);
    } catch (e) {
      console.error(`   ❌ users: ${e.message}`);
    }
  }

  // Daily logs
  if (sheets.Data) {
    const logs = transformDailyLogs(sheets.Data);
    console.log(`📦 Importing daily_logs: ${logs.length} rows...`);
    // Batch in chunks of 50 (D1 batch limit safety)
    for (let i = 0; i < logs.length; i += 50) {
      const chunk = logs.slice(i, i + 50);
      try {
        const result = await callAPI('admin_import', { table: 'daily_logs', rows: chunk }, token);
        console.log(`   ✅ daily_logs batch ${Math.floor(i/50)+1}: ${result.imported} imported`);
      } catch (e) {
        console.error(`   ❌ daily_logs batch ${Math.floor(i/50)+1}: ${e.message}`);
      }
    }
  }

  // Meal plans
  if (sheets.MealPlan) {
    const plans = transformMealPlans(sheets.MealPlan);
    console.log(`📦 Importing meal_plans: ${plans.length} rows (non-empty)...`);
    for (let i = 0; i < plans.length; i += 50) {
      const chunk = plans.slice(i, i + 50);
      try {
        const result = await callAPI('admin_import', { table: 'meal_plans', rows: chunk }, token);
        console.log(`   ✅ meal_plans batch ${Math.floor(i/50)+1}: ${result.imported} imported`);
      } catch (e) {
        console.error(`   ❌ meal_plans batch ${Math.floor(i/50)+1}: ${e.message}`);
      }
    }
  }

  console.log('\n🎉 Migration complete!');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
