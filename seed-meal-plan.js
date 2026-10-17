#!/usr/bin/env node
/**
 * Seeds ingredients (from meal-planner/ingredients.json) and catered_menu
 * into D1 via the admin_seed endpoint.
 *
 * Usage: node seed-meal-plan.js <admin-token> [api-url]
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_API = 'https://aevum-api-v2.marco-iannitto.workers.dev';

async function callAPI(action, body, token, api) {
  const res = await fetch(api, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://app.niramaya.sg',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ action, ...body })
  });
  const data = await res.json();
  if (data.error) throw new Error(`API error (${action}): ${data.error}`);
  return data;
}

async function main() {
  const [,, token, apiUrl] = process.argv;
  if (!token) {
    console.error('Usage: node seed-meal-plan.js <admin-token> [api-url]');
    process.exit(1);
  }
  const api = apiUrl || DEFAULT_API;

  // 1. Seed ingredients from ingredients.json
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'meal-planner', 'ingredients.json'), 'utf-8'));
  const ingredients = raw.map(i => ({
    id: i.id,
    name: i.name,
    category: i.category,
    per_100g_kcal: i.per100g.kcal,
    per_100g_p: i.per100g.p,
    per_100g_f: i.per100g.f,
    per_100g_c: i.per100g.c,
    source: i.source || 'manual'
  }));

  console.log(`Seeding ingredients: ${ingredients.length} rows...`);
  try {
    const r = await callAPI('admin_seed', { table: 'ingredients', rows: ingredients }, token, api);
    console.log(`  Done: ${r.inserted} inserted`);
  } catch (e) {
    console.error(`  Error: ${e.message}`);
  }

  // 2. Seed catered_menu defaults
  const cateredMenu = [
    // Proteins
    { category: 'protein', name: 'Chicken Breast', per_serving_kcal: 165, per_serving_p: 31, per_serving_f: 3.6, per_serving_c: 0, serving_g: 150 },
    { category: 'protein', name: 'Beef (lean)', per_serving_kcal: 200, per_serving_p: 30, per_serving_f: 8, per_serving_c: 0, serving_g: 150 },
    { category: 'protein', name: 'Tofu (firm)', per_serving_kcal: 120, per_serving_p: 15, per_serving_f: 7, per_serving_c: 2, serving_g: 150 },
    { category: 'protein', name: 'Tempeh', per_serving_kcal: 160, per_serving_p: 18, per_serving_f: 9, per_serving_c: 4, serving_g: 100 },
    { category: 'protein', name: 'Prawns', per_serving_kcal: 100, per_serving_p: 24, per_serving_f: 0.3, per_serving_c: 0.2, serving_g: 150 },
    { category: 'protein', name: 'Fish (white)', per_serving_kcal: 130, per_serving_p: 28, per_serving_f: 1.5, per_serving_c: 0, serving_g: 150 },
    // Vegetables
    { category: 'vegetable', name: 'Broccoli', per_serving_kcal: 34, per_serving_p: 2.8, per_serving_f: 0.4, per_serving_c: 7, serving_g: 100 },
    { category: 'vegetable', name: 'Bok Choy', per_serving_kcal: 13, per_serving_p: 1.5, per_serving_f: 0.2, per_serving_c: 2.2, serving_g: 100 },
    { category: 'vegetable', name: 'Lettuce (mixed)', per_serving_kcal: 15, per_serving_p: 1.3, per_serving_f: 0.2, per_serving_c: 2.9, serving_g: 100 },
    { category: 'vegetable', name: 'Spinach', per_serving_kcal: 23, per_serving_p: 2.9, per_serving_f: 0.4, per_serving_c: 3.6, serving_g: 100 },
    { category: 'vegetable', name: 'Zucchini', per_serving_kcal: 17, per_serving_p: 1.2, per_serving_f: 0.3, per_serving_c: 3.1, serving_g: 100 },
    { category: 'vegetable', name: 'Bell Pepper', per_serving_kcal: 31, per_serving_p: 1, per_serving_f: 0.3, per_serving_c: 6, serving_g: 100 },
    // Structures (cooking style - macros are 0, they don't add nutrition)
    { category: 'structure', name: 'Salad', per_serving_kcal: 0, per_serving_p: 0, per_serving_f: 0, per_serving_c: 0, serving_g: 0 },
    { category: 'structure', name: 'Pan Fried', per_serving_kcal: 40, per_serving_p: 0, per_serving_f: 4.5, per_serving_c: 0, serving_g: 0 },
    { category: 'structure', name: 'Soup', per_serving_kcal: 15, per_serving_p: 0.5, per_serving_f: 0.2, per_serving_c: 3, serving_g: 0 },
    { category: 'structure', name: 'Steamed', per_serving_kcal: 0, per_serving_p: 0, per_serving_f: 0, per_serving_c: 0, serving_g: 0 },
    { category: 'structure', name: 'Grilled', per_serving_kcal: 0, per_serving_p: 0, per_serving_f: 0, per_serving_c: 0, serving_g: 0 },
    // Flavorings (minimal macros)
    { category: 'flavoring', name: 'Soy Ginger', per_serving_kcal: 15, per_serving_p: 1, per_serving_f: 0, per_serving_c: 2, serving_g: 15 },
    { category: 'flavoring', name: 'Lemon Chives', per_serving_kcal: 8, per_serving_p: 0, per_serving_f: 0.2, per_serving_c: 1.5, serving_g: 15 },
    { category: 'flavoring', name: 'Garlic Herb', per_serving_kcal: 10, per_serving_p: 0.2, per_serving_f: 0.5, per_serving_c: 1, serving_g: 15 },
    { category: 'flavoring', name: 'Chili Lime', per_serving_kcal: 12, per_serving_p: 0.1, per_serving_f: 0.1, per_serving_c: 2.5, serving_g: 15 },
    { category: 'flavoring', name: 'Teriyaki', per_serving_kcal: 20, per_serving_p: 1, per_serving_f: 0, per_serving_c: 4, serving_g: 15 },
    { category: 'flavoring', name: 'Plain (no sauce)', per_serving_kcal: 0, per_serving_p: 0, per_serving_f: 0, per_serving_c: 0, serving_g: 0 },
  ];

  console.log(`Seeding catered_menu: ${cateredMenu.length} rows...`);
  try {
    const r = await callAPI('admin_seed', { table: 'catered_menu', rows: cateredMenu }, token, api);
    console.log(`  Done: ${r.inserted} inserted`);
  } catch (e) {
    console.error(`  Error: ${e.message}`);
  }

  console.log('\nDone!');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
