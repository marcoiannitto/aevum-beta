/**
 * AI proxy routes: estimateMeal, foodCheck, shopList
 * These call external AI services (Anthropic API / AI worker).
 */

import type { Env } from '../env.js';
import { HAIKU_MODEL, AI_WORKER_DEFAULT } from '@aevum/shared';
import { getPolicyText } from './data.js';

export async function estimateMeal(userId: string, body: any, db: D1Database, env: Env) {
  const url = env.AI_WORKER_URL || AI_WORKER_DEFAULT;
  const phase = String(body.phase || 'activation').toLowerCase();
  const policy = await getPolicyText(phase, db);

  const workerBody: any = { action: 'estimate', phase, description: body.description || '', policy };
  if (body.image) workerBody.image = body.image;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workerBody),
  });
  try {
    const data: any = await res.json();
    if (data.error) return { error: data.error, detail: data.detail || '' };
    return data;
  } catch {
    return { error: 'worker parse error' };
  }
}

export async function foodCheck(body: any, db: D1Database, env: Env) {
  const key = env.ANTHROPIC_KEY;
  if (!key) return { error: 'no key set' };
  const food = String(body.food || '').trim();
  if (!food) return { error: 'no food' };

  const phase = String(body.phase || 'activation').toLowerCase();
  const policy = await getPolicyText(phase, db);

  const rulesBlock = policy
    ? 'PHASE RULES (judge the food against these):\n' + policy + '\n'
    : 'You classify a single food for the AEVUM Activation diet (a protein-sparing modified fast). ';

  const sys =
    'You classify a single food for the AEVUM program. ' +
    'Judge the food per 100g, raw. Identify the food correctly. ' +
    'Return ONLY strict JSON, no prose: ' +
    '{"food":string,"verdict":"yes"|"limited"|"no","reason":string,"cap":string}. ' +
    rulesBlock +
    'field "reason" = max 8 words. field "cap" = for LIMITED only, a sensible max amount; empty string for yes/no.';

  const payload = {
    model: HAIKU_MODEL,
    max_tokens: 160,
    system: sys,
    messages: [{ role: 'user', content: 'Food: ' + food }],
  };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
  });
  const data: any = await res.json();
  if (!data.content) return { error: 'ai error', detail: data };
  const txt = data.content
    .map((c: any) => c.text || '')
    .join('')
    .trim()
    .replace(/```json|```/g, '')
    .trim();
  try {
    const j = JSON.parse(txt);
    return { food: j.food || food, verdict: j.verdict || 'limited', reason: j.reason || '', cap: j.cap || '' };
  } catch {
    return { error: 'parse', raw: txt };
  }
}

export async function shopList(body: any, env: Env) {
  const key = env.ANTHROPIC_KEY;
  if (!key) return { error: 'no key set' };
  const ingredients = body.ingredients || [];
  if (!ingredients.length) return { items: [] };

  const sys =
    'You build a grocery shopping list. Merge duplicates, sum quantities. ' +
    'For dish names, infer main ingredients. Merge different names for same item. Ignore water, salt, pepper. ' +
    'Return ONLY strict JSON: {"groups":[{"category":string,"items":[{"name":string,"qty":string}]}]}. ' +
    'Categories: Protein, Vegetables, Fruit, Pantry/Other.';

  const payload = {
    model: HAIKU_MODEL,
    max_tokens: 1200,
    system: sys,
    messages: [{ role: 'user', content: 'Ingredients:\n' + ingredients.join('\n') }],
  };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
  });
  const data: any = await res.json();
  if (!data.content) return { error: 'ai error', detail: data };
  const txt = data.content
    .map((c: any) => c.text || '')
    .join('')
    .trim()
    .replace(/```json|```/g, '')
    .trim();
  try {
    return JSON.parse(txt);
  } catch {
    return { error: 'parse', raw: txt };
  }
}
