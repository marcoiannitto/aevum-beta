#!/usr/bin/env node
// AEVUM D1 Seed Script — run locally:
//   node seed.js <ADMIN_TOKEN>
//
// Seeds: rules, foods, policy, config
// Target: https://aevum-api-v2.marco-iannitto.workers.dev

const BACKEND = 'https://aevum-api-v2.marco-iannitto.workers.dev';
const TOKEN = process.argv[2];
if (!TOKEN) { console.error('Usage: node seed.js <ADMIN_TOKEN>'); process.exit(1); }

async function seed(table, rows) {
  console.log(`Seeding ${table} (${rows.length} rows)...`);
  const res = await fetch(BACKEND, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
    body: JSON.stringify({ action: 'admin_seed', table, rows })
  });
  const d = await res.json();
  if (d.error) { console.error(`  ERROR: ${d.error}`); return false; }
  console.log(`  OK: ${d.inserted} inserted`);
  return true;
}

// ── RULES ──
const rules = [
  { phase:'loading', model:'all', metric:'kcal', basis:'none', value:null, green_lo:null, green_hi:null, amber_lo:null, amber_hi:null, gated:'no', unit:'kcal' },
  { phase:'activation', model:'buckets', metric:'kcal', basis:'fixed', value:525, green_lo:450, green_hi:600, amber_lo:400, amber_hi:700, gated:'yes', unit:'kcal' },
  { phase:'activation', model:'buckets', metric:'protein_food_g', basis:'fixed', value:125, green_lo:100, green_hi:150, amber_lo:null, amber_hi:null, gated:'yes', unit:'g' },
  { phase:'activation', model:'buckets', metric:'veg_g', basis:'fixed', value:100, green_lo:null, green_hi:100, amber_lo:null, amber_hi:150, gated:'yes', unit:'g' },
  { phase:'activation', model:'buckets', metric:'fruit_g', basis:'fixed', value:100, green_lo:null, green_hi:100, amber_lo:null, amber_hi:100, gated:'yes', unit:'g' },
  { phase:'activation', model:'macros', metric:'kcal', basis:'fixed', value:650, green_lo:550, green_hi:750, amber_lo:500, amber_hi:800, gated:'yes', unit:'kcal' },
  { phase:'activation', model:'macros', metric:'protein', basis:'fixed', value:90, green_lo:90, green_hi:null, amber_lo:70, amber_hi:null, gated:'yes', unit:'g' },
  { phase:'activation', model:'macros', metric:'carbs', basis:'fixed', value:30, green_lo:null, green_hi:30, amber_lo:null, amber_hi:35, gated:'yes', unit:'g' },
  { phase:'activation', model:'macros', metric:'fat', basis:'none', value:null, green_lo:null, green_hi:null, amber_lo:null, amber_hi:null, gated:'no', unit:'g' },
  { phase:'stabilization', model:'all', metric:'kcal', basis:'adaptive_kcal', value:null, green_lo:90, green_hi:115, amber_lo:80, amber_hi:125, gated:'yes', unit:'kcal' },
  { phase:'stabilization', model:'all', metric:'protein', basis:'per_kg_target_weight', value:1.2, green_lo:1.2, green_hi:1.5, amber_lo:1.0, amber_hi:null, gated:'yes', unit:'g' },
  { phase:'stabilization', model:'all', metric:'carbs', basis:'fixed', value:40, green_lo:null, green_hi:40, amber_lo:null, amber_hi:50, gated:'yes', unit:'g' },
  { phase:'stabilization', model:'all', metric:'fat', basis:'none', value:null, green_lo:null, green_hi:null, amber_lo:null, amber_hi:null, gated:'no', unit:'g' },
  { phase:'maintenance', model:'all', metric:'kcal', basis:'adaptive_kcal', value:null, green_lo:90, green_hi:115, amber_lo:80, amber_hi:125, gated:'yes', unit:'kcal' },
  { phase:'maintenance', model:'keto', metric:'kcal', basis:'adaptive_kcal', value:null, green_lo:null, green_hi:null, amber_lo:null, amber_hi:null, gated:'yes', unit:'kcal' },
  { phase:'maintenance', model:'keto', metric:'fat', basis:'pct_of_kcal', value:70, green_lo:65, green_hi:75, amber_lo:60, amber_hi:80, gated:'yes', unit:'%' },
  { phase:'maintenance', model:'keto', metric:'protein', basis:'pct_of_kcal', value:20, green_lo:18, green_hi:25, amber_lo:15, amber_hi:null, gated:'yes', unit:'%' },
  { phase:'maintenance', model:'keto', metric:'carbs', basis:'pct_of_kcal', value:10, green_lo:null, green_hi:10, amber_lo:null, amber_hi:15, gated:'yes', unit:'%' },
  { phase:'maintenance', model:'high_protein', metric:'kcal', basis:'adaptive_kcal', value:null, green_lo:null, green_hi:null, amber_lo:null, amber_hi:null, gated:'yes', unit:'kcal' },
  { phase:'maintenance', model:'high_protein', metric:'protein', basis:'pct_of_kcal', value:35, green_lo:30, green_hi:40, amber_lo:25, amber_hi:null, gated:'yes', unit:'%' },
  { phase:'maintenance', model:'high_protein', metric:'fat', basis:'pct_of_kcal', value:30, green_lo:25, green_hi:35, amber_lo:20, amber_hi:40, gated:'yes', unit:'%' },
  { phase:'maintenance', model:'high_protein', metric:'carbs', basis:'pct_of_kcal', value:35, green_lo:30, green_hi:40, amber_lo:25, amber_hi:45, gated:'yes', unit:'%' },
  { phase:'maintenance', model:'balanced', metric:'kcal', basis:'adaptive_kcal', value:null, green_lo:null, green_hi:null, amber_lo:null, amber_hi:null, gated:'yes', unit:'kcal' },
  { phase:'maintenance', model:'balanced', metric:'protein', basis:'none', value:null, green_lo:null, green_hi:null, amber_lo:null, amber_hi:null, gated:'no', unit:'g' },
  { phase:'maintenance', model:'balanced', metric:'fat', basis:'none', value:null, green_lo:null, green_hi:null, amber_lo:null, amber_hi:null, gated:'no', unit:'g' },
  { phase:'maintenance', model:'balanced', metric:'carbs', basis:'none', value:null, green_lo:null, green_hi:null, amber_lo:null, amber_hi:null, gated:'no', unit:'g' },
];

// ── FOODS ──
const foods = [
  // === LOADING ===
  {phase:'loading',category:'protein',subcategory:null,item:'all whole foods',verdict:'yes',cap_g:null,note:'eat freely'},
  {phase:'loading',category:'vegetable',subcategory:null,item:'all vegetables',verdict:'yes',cap_g:null,note:null},
  {phase:'loading',category:'fruit',subcategory:null,item:'all fruit',verdict:'yes',cap_g:null,note:null},
  {phase:'loading',category:'other',subcategory:null,item:'added-sugar sweets',verdict:'no',cap_g:null,note:null},
  {phase:'loading',category:'other',subcategory:null,item:'sugary drinks',verdict:'no',cap_g:null,note:null},
  {phase:'loading',category:'other',subcategory:null,item:'alcohol',verdict:'no',cap_g:null,note:null},
  // === ACTIVATION PROTEINS ===
  {phase:'activation',category:'protein',subcategory:'meat/poultry',item:'chicken breast',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'meat/poultry',item:'turkey breast',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'fish/seafood',item:'cod',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'fish/seafood',item:'sea bass',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'fish/seafood',item:'sea bream',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'fish/seafood',item:'sole',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'fish/seafood',item:'hake',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'fish/seafood',item:'prawns',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'fish/seafood',item:'shrimp',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'fish/seafood',item:'squid',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'fish/seafood',item:'octopus',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'fish/seafood',item:'cuttlefish',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'fish/seafood',item:'clams',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'fish/seafood',item:'mussels',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'egg',item:'egg whites',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'plant',item:'tofu',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'meat/poultry',item:'veal (lean)',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'meat/poultry',item:'rabbit',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'meat/poultry',item:'bresaola',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'meat/poultry',item:'turkey thigh',verdict:'limited',cap_g:null,note:'leaner cuts preferred'},
  {phase:'activation',category:'protein',subcategory:'fish/seafood',item:'swordfish',verdict:'limited',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'fish/seafood',item:'tuna (fresh)',verdict:'limited',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'plant',item:'tempeh',verdict:'limited',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'meat/poultry',item:'prosciutto crudo (no fat)',verdict:'limited',cap_g:null,note:'trim all fat'},
  {phase:'activation',category:'protein',subcategory:'meat/poultry',item:'prosciutto cotto (no fat)',verdict:'limited',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'fish/seafood',item:'salmon',verdict:'no',cap_g:null,note:'oily fish'},
  {phase:'activation',category:'protein',subcategory:'fish/seafood',item:'mackerel',verdict:'no',cap_g:null,note:'oily fish'},
  {phase:'activation',category:'protein',subcategory:'fish/seafood',item:'sardines',verdict:'no',cap_g:null,note:'oily fish'},
  {phase:'activation',category:'protein',subcategory:'meat/poultry',item:'pork',verdict:'no',cap_g:null,note:null},
  {phase:'activation',category:'protein',subcategory:'egg',item:'whole eggs',verdict:'no',cap_g:null,note:'yolk fat'},
  {phase:'activation',category:'protein',subcategory:null,item:'cheese',verdict:'no',cap_g:null,note:null},
  // === ACTIVATION VEGETABLES ===
  {phase:'activation',category:'vegetable',subcategory:null,item:'zucchini',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'spinach',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'lettuce',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'rocket/arugula',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'kale',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'chard',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'broccoli',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'cauliflower',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'asparagus',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'green beans',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'cucumber',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'celery',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'fennel',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'mushrooms',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'bell peppers',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'tomatoes',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'eggplant',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'cabbage',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'onion',verdict:'limited',cap_g:null,note:'small amounts'},
  {phase:'activation',category:'vegetable',subcategory:null,item:'carrot',verdict:'limited',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'beetroot',verdict:'limited',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'pumpkin',verdict:'limited',cap_g:null,note:null},
  {phase:'activation',category:'vegetable',subcategory:null,item:'potato',verdict:'no',cap_g:null,note:'starchy'},
  {phase:'activation',category:'vegetable',subcategory:null,item:'sweet potato',verdict:'no',cap_g:null,note:'starchy'},
  {phase:'activation',category:'vegetable',subcategory:null,item:'corn',verdict:'no',cap_g:null,note:'starchy'},
  {phase:'activation',category:'vegetable',subcategory:null,item:'peas',verdict:'no',cap_g:null,note:'starchy'},
  {phase:'activation',category:'vegetable',subcategory:null,item:'beans/legumes',verdict:'no',cap_g:null,note:null},
  // === ACTIVATION FRUIT ===
  {phase:'activation',category:'fruit',subcategory:null,item:'apple',verdict:'yes',cap_g:100,note:null},
  {phase:'activation',category:'fruit',subcategory:null,item:'orange',verdict:'yes',cap_g:100,note:null},
  {phase:'activation',category:'fruit',subcategory:null,item:'grapefruit',verdict:'yes',cap_g:100,note:null},
  {phase:'activation',category:'fruit',subcategory:null,item:'strawberries',verdict:'yes',cap_g:100,note:null},
  {phase:'activation',category:'fruit',subcategory:null,item:'blueberries',verdict:'yes',cap_g:100,note:null},
  {phase:'activation',category:'fruit',subcategory:null,item:'raspberries',verdict:'yes',cap_g:100,note:null},
  {phase:'activation',category:'fruit',subcategory:null,item:'blackberries',verdict:'yes',cap_g:100,note:null},
  {phase:'activation',category:'fruit',subcategory:null,item:'peach',verdict:'yes',cap_g:100,note:null},
  {phase:'activation',category:'fruit',subcategory:null,item:'plum',verdict:'yes',cap_g:100,note:null},
  {phase:'activation',category:'fruit',subcategory:null,item:'banana',verdict:'no',cap_g:null,note:'high sugar'},
  {phase:'activation',category:'fruit',subcategory:null,item:'grape',verdict:'no',cap_g:null,note:'high sugar'},
  {phase:'activation',category:'fruit',subcategory:null,item:'mango',verdict:'no',cap_g:null,note:'high sugar'},
  {phase:'activation',category:'fruit',subcategory:null,item:'pineapple',verdict:'no',cap_g:null,note:'high sugar'},
  // === ACTIVATION SNACKS ===
  {phase:'activation',category:'snack',subcategory:null,item:'fat-free greek yogurt',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'snack',subcategory:null,item:'dark chocolate (>85%)',verdict:'limited',cap_g:20,note:'max 20g'},
  {phase:'activation',category:'snack',subcategory:null,item:'bresaola',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'snack',subcategory:null,item:'prosciutto crudo (no fat)',verdict:'limited',cap_g:null,note:'1-2x per week'},
  {phase:'activation',category:'snack',subcategory:null,item:'fesa di tacchino',verdict:'yes',cap_g:null,note:null},
  // === ACTIVATION COOKING ===
  {phase:'activation',category:'cooking_method',subcategory:null,item:'grilled',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'cooking_method',subcategory:null,item:'boiled',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'cooking_method',subcategory:null,item:'steamed',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'cooking_method',subcategory:null,item:'baked',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'cooking_method',subcategory:null,item:'poached',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'cooking_method',subcategory:null,item:'raw',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'cooking_method',subcategory:null,item:'air-fried (no oil)',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'cooking_method',subcategory:null,item:'fried',verdict:'no',cap_g:null,note:'uses fat'},
  {phase:'activation',category:'cooking_method',subcategory:null,item:'sauteed in oil',verdict:'no',cap_g:null,note:'uses fat'},
  // === ACTIVATION SEASONING ===
  {phase:'activation',category:'seasoning',subcategory:null,item:'salt',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'seasoning',subcategory:null,item:'pepper',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'seasoning',subcategory:null,item:'herbs',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'seasoning',subcategory:null,item:'spices',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'seasoning',subcategory:null,item:'lemon juice',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'seasoning',subcategory:null,item:'vinegar',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'seasoning',subcategory:null,item:'garlic',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'seasoning',subcategory:null,item:'chilli',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'seasoning',subcategory:null,item:'mustard (no sugar)',verdict:'yes',cap_g:null,note:null},
  {phase:'activation',category:'seasoning',subcategory:null,item:'soy sauce (small)',verdict:'limited',cap_g:null,note:null},
  {phase:'activation',category:'seasoning',subcategory:null,item:'oil',verdict:'no',cap_g:null,note:null},
  {phase:'activation',category:'seasoning',subcategory:null,item:'sugar',verdict:'no',cap_g:null,note:null},
  // === STABILIZATION ===
  {phase:'stabilization',category:'protein',subcategory:'meat/poultry',item:'chicken (any cut)',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'protein',subcategory:'meat/poultry',item:'beef',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'protein',subcategory:'meat/poultry',item:'pork',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'protein',subcategory:'fish/seafood',item:'salmon',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'protein',subcategory:'fish/seafood',item:'tuna',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'protein',subcategory:'fish/seafood',item:'mackerel',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'protein',subcategory:'egg',item:'whole eggs',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'protein',subcategory:'fish/seafood',item:'shellfish',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'protein',subcategory:'plant',item:'tofu',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'protein',subcategory:'plant',item:'tempeh',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'protein',subcategory:'meat/poultry',item:'honey ham',verdict:'no',cap_g:null,note:'added sugar'},
  {phase:'stabilization',category:'protein',subcategory:null,item:'breaded/battered',verdict:'no',cap_g:null,note:null},
  {phase:'stabilization',category:'vegetable',subcategory:null,item:'leafy greens',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'vegetable',subcategory:null,item:'broccoli',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'vegetable',subcategory:null,item:'cauliflower',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'vegetable',subcategory:null,item:'zucchini',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'vegetable',subcategory:null,item:'asparagus',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'vegetable',subcategory:null,item:'mushrooms',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'vegetable',subcategory:null,item:'bell pepper',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'vegetable',subcategory:null,item:'carrot',verdict:'limited',cap_g:null,note:'carb-dense'},
  {phase:'stabilization',category:'vegetable',subcategory:null,item:'beetroot',verdict:'limited',cap_g:null,note:null},
  {phase:'stabilization',category:'vegetable',subcategory:null,item:'pumpkin',verdict:'limited',cap_g:null,note:null},
  {phase:'stabilization',category:'vegetable',subcategory:null,item:'potato',verdict:'no',cap_g:null,note:'starchy'},
  {phase:'stabilization',category:'vegetable',subcategory:null,item:'beans/legumes',verdict:'no',cap_g:null,note:null},
  {phase:'stabilization',category:'fat',subcategory:null,item:'olive oil',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'fat',subcategory:null,item:'avocado',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'fat',subcategory:null,item:'butter',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'fat',subcategory:null,item:'nuts',verdict:'limited',cap_g:null,note:'carbs add up'},
  {phase:'stabilization',category:'fat',subcategory:null,item:'seeds',verdict:'limited',cap_g:null,note:null},
  {phase:'stabilization',category:'dairy',subcategory:null,item:'hard cheese',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'dairy',subcategory:null,item:'full-fat greek yogurt',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'dairy',subcategory:null,item:'heavy cream',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'dairy',subcategory:null,item:'milk',verdict:'no',cap_g:null,note:'sugar'},
  {phase:'stabilization',category:'dairy',subcategory:null,item:'sweetened yogurt',verdict:'no',cap_g:null,note:null},
  {phase:'stabilization',category:'fruit',subcategory:null,item:'strawberries',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'fruit',subcategory:null,item:'raspberries',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'fruit',subcategory:null,item:'blueberries',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'fruit',subcategory:null,item:'blackberries',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'fruit',subcategory:null,item:'lemon',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'fruit',subcategory:null,item:'banana',verdict:'no',cap_g:null,note:null},
  {phase:'stabilization',category:'fruit',subcategory:null,item:'apple',verdict:'no',cap_g:null,note:null},
  {phase:'stabilization',category:'cooking_method',subcategory:null,item:'grilled',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'cooking_method',subcategory:null,item:'pan-fried in allowed fat',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'cooking_method',subcategory:null,item:'baked',verdict:'yes',cap_g:null,note:null},
  {phase:'stabilization',category:'cooking_method',subcategory:null,item:'roasted',verdict:'yes',cap_g:null,note:null},
];

// ── POLICY ──
const policy = [
  { phase:'loading', rules_text:'Eat freely from whole foods. No added-sugar sweets, sugary drinks, or alcohol.' },
  { phase:'activation', rules_text:'Max ~525 kcal/day (buckets) or ~650 kcal/day (macros). Lean protein only (chicken breast, turkey breast, white fish, seafood, egg whites, tofu). No oil, no fat, no cheese, no oily fish. Vegetables from approved list, ~100g. One fruit serving ~100g (low-sugar only). No starchy vegetables, no legumes, no grains, no bread, no pasta, no rice. Cooking: grill, boil, steam, bake, poach, air-fry without oil. Season with herbs, spices, lemon, vinegar, garlic.' },
  { phase:'stabilization', rules_text:'Adaptive calorie target (TDEE-based). Protein 1.2-1.5g per kg target weight. Carbs under 40g. Fat allowed (olive oil, avocado, butter, hard cheese). Oily fish allowed. Whole eggs allowed. Berries only for fruit. No starchy vegetables, no legumes, no grains, no bread, no pasta, no rice, no milk, no sweetened yogurt.' },
  { phase:'maintenance', rules_text:'Adaptive calorie target. Macros depend on chosen diet plan (keto, high-protein, or balanced). Follow the specific macro splits for the selected plan. Avoid processed foods and added sugars.' },
];

// ── RUN ──
(async () => {
  let ok = true;
  ok = await seed('rules', rules) && ok;
  ok = await seed('foods', foods) && ok;
  ok = await seed('policy', policy) && ok;
  if (ok) console.log('\nAll seeded successfully.');
  else console.log('\nSome tables failed. Check errors above.');
})();
