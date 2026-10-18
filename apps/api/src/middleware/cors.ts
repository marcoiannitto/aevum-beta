/**
 * CORS middleware for Hono.
 */

import { createMiddleware } from 'hono/factory';
import type { Env } from '../env.js';

export const corsMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const origin = c.req.header('Origin') || '';
  const allowed = c.env.ALLOWED_ORIGIN || 'https://app.niramaya.sg';

  const ok =
    origin === allowed ||
    origin === 'http://localhost:8080' ||
    origin === 'http://127.0.0.1:8080';

  if (!ok && c.req.method !== 'GET') {
    return c.text('Forbidden', 403);
  }

  // Set CORS headers
  if (ok) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
    c.header('Access-Control-Max-Age', '86400');
  }

  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }

  await next();
});
