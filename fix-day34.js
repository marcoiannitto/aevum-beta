#!/usr/bin/env node
/**
 * One-shot fix: re-import day 34 for marco with correct day_json.
 * Run AFTER deleting the stale row:
 *   wrangler d1 execute aevum-db --remote --command "DELETE FROM daily_logs WHERE user_id='marco' AND day=34"
 *
 * Usage (from aevum-beta folder):
 *   node fix-day34.js Niramaya123
 */

const API = 'https://aevum-api-v2.marco-iannitto.workers.dev';
const token = process.argv[2];
if (!token) { console.error('Usage: node fix-day34.js <admin-token>'); process.exit(1); }

const dayJson = {"meals":[{"name":"120g Greek yogurt, 15g whey isolate, 5g dark chocolate 40%, 25g mixed nuts","kcal":347,"protein":30,"fat":19,"carbs":14,"items":[{"name":"Greek yogurt (assumed low-fat, plain)","grams":120,"kcal":86,"protein":12,"fat":2,"carbs":5,"type":"protein","verdict":"yes","note":""},{"name":"Whey protein isolate","grams":15,"kcal":56,"protein":13,"fat":0,"carbs":1,"type":"protein","verdict":"yes","note":""},{"name":"Dark chocolate 40%","grams":5,"kcal":30,"protein":0,"fat":2,"carbs":3,"type":"other","verdict":"no","note":"added sugar"},{"name":"Mixed nuts","grams":25,"kcal":175,"protein":5,"fat":15,"carbs":5,"type":"other","verdict":"no","note":"nuts, high fat"}],"time":"11:46","ts":1791690406822},{"name":"1 chocolate croissant (pain au chocolat), ~80g","kcal":340,"protein":6,"fat":18,"carbs":38,"items":[{"name":"Pain au chocolat (butter pastry, chocolate filling)","grams":80,"kcal":340,"protein":6,"fat":18,"carbs":38,"type":"other","verdict":"no","note":"fried pastry, butter, sugar"}],"time":"11:47","ts":1791690427412},{"name":"Starbucks pulled chicken croissant (1 sandwich)","kcal":492,"protein":23,"fat":28,"carbs":37,"items":[{"name":"Butter croissant","grams":75,"kcal":300,"protein":6,"fat":16,"carbs":33,"type":"other","verdict":"no","note":"refined grain, butter"},{"name":"Pulled chicken","grams":60,"kcal":74,"protein":14,"fat":2,"carbs":0,"type":"protein","verdict":"yes","note":""},{"name":"Creamy sauce and cheese","grams":40,"kcal":118,"protein":3,"fat":10,"carbs":4,"type":"other","verdict":"no","note":"cheese, mayo-style sauce"}],"time":"16:53","ts":1791708798333},{"name":"50g mixed nuts","kcal":304,"protein":10,"fat":27,"carbs":9,"items":[{"name":"Mixed nuts","grams":50,"kcal":304,"protein":10,"fat":27,"carbs":9,"type":"other","verdict":"no","note":"high fat nuts"}],"time":"18:18","ts":1791713930993},{"name":"30g whey protein isolate powder","kcal":121,"protein":27,"fat":1,"carbs":1,"items":[{"name":"Whey protein isolate powder","grams":30,"kcal":121,"protein":27,"fat":1,"carbs":1,"type":"protein","verdict":"yes","note":""}],"time":"18:19","ts":1791713944115},{"name":"50g firm tofu","kcal":72,"protein":8,"fat":4,"carbs":1,"items":[{"name":"Firm tofu","grams":50,"kcal":72,"protein":8,"fat":4,"carbs":1,"type":"protein","verdict":"yes","note":""}],"time":"18:19","ts":1791713954861},{"name":"2 grilled satay skewers (~50g meat total)","kcal":130,"protein":9,"fat":8,"carbs":5,"items":[{"name":"Grilled satay meat (marinated, fatty cut)","grams":50,"kcal":130,"protein":9,"fat":8,"carbs":5,"type":"protein","verdict":"no","note":"sugared marinade, fatty, grilled"}],"time":"18:48","ts":1791715714456},{"name":"1 chicken nugget (~18g)","kcal":50,"protein":3,"fat":3,"carbs":3,"items":[{"name":"Chicken nugget, breaded and fried","grams":18,"kcal":50,"protein":3,"fat":3,"carbs":3,"type":"protein","verdict":"no","note":"breaded and fried"}],"time":"18:53","ts":1791716016215},{"name":"1 chicken nugget (~16g)","kcal":48,"protein":3,"fat":3,"carbs":3,"items":[{"name":"Chicken nugget, breaded and fried","grams":16,"kcal":48,"protein":3,"fat":3,"carbs":3,"type":"protein","verdict":"no","note":"breaded and fried"}],"time":"18:54","ts":1791716090924},{"name":"30g chicken breast + 30g cooked white rice","kcal":81,"protein":10,"fat":1,"carbs":8,"items":[{"name":"Chicken breast, cooked","grams":30,"kcal":45,"protein":9,"fat":1,"carbs":0,"type":"protein","verdict":"yes","note":""},{"name":"White rice, cooked","grams":30,"kcal":36,"protein":1,"fat":0,"carbs":8,"type":"other","verdict":"no","note":"grain/starch"}],"time":"19:03","ts":1791716597788},{"name":"3 pieces salmon nigiri sushi","kcal":198,"protein":11,"fat":6,"carbs":25,"items":[{"name":"Sushi rice (seasoned)","grams":75,"kcal":108,"protein":2,"fat":0,"carbs":25,"type":"other","verdict":"no","note":"rice, added sugar"},{"name":"Raw salmon","grams":45,"kcal":90,"protein":9,"fat":6,"carbs":0,"type":"protein","verdict":"no","note":"oily fish"}],"time":"19:03","ts":1791716614757}],"water":5,"weight":"74.9","waist":"","serumAM":false,"serumPM":false,"exercise":[],"energy":5,"hunger":1,"sleep":5,"notes":"Drank a lot in Glenn's yacht","date":"2026-10-11"};

const row = {
  user_id: 'marco',
  day: 34,
  phase: 'Maintenance',
  date: '2026-10-11',
  weight: 74.9,
  waist: null,
  serum_am: null,
  serum_pm: null,
  kcal: 2183,
  protein: 140,
  fat: 118,
  carbs: 144,
  water_ml: 1250,
  exercise: null,
  exercise_kcal: 0,
  energy: '5',
  hunger: '1',
  sleep: '5',
  notes: "Drank a lot in Glenn's yacht",
  day_json: JSON.stringify(dayJson)
};

async function main() {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://beta.niramaya.sg',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ action: 'admin_import', table: 'daily_logs', rows: [row] })
  });
  const data = await res.json();
  console.log(data);
}

main().catch(e => { console.error(e); process.exit(1); });
