/**
 * Rate limiter middleware (per-isolate, best effort).
 * Same behavior as the original: in-memory map, 60 req/min per IP.
 */

import { createMiddleware } from 'hono/factory';
import { RATE_LIMIT, RATE_WINDOW_MS } from '@aevum/shared';

const rateMap = new Map<string, { start: number; count: number }>();

export const rateLimitMiddleware = createMiddleware(async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const now = Date.now();

  let entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    entry = { start: now, count: 0 };
    rateMap.set(ip, entry);
  }
  entry.count++;

  // Cleanup old entries
  if (rateMap.size > 10_000) {
    for (const [k, v] of rateMap) {
      if (now - v.start > RATE_WINDOW_MS) rateMap.delete(k);
    }
  }

  if (entry.count > RATE_LIMIT) {
    return c.json({ error: 'Too many requests' }, 429);
  }

  await next();
});
