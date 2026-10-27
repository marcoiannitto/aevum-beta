/**
 * Auth middleware for Hono.
 */

import { createMiddleware } from 'hono/factory';
import type { Env } from '../env.js';

export interface AuthUser {
  userId: string;
  role: string;
  isAdmin: boolean;
}

/** Middleware that requires authentication */
export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: { user: AuthUser };
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const row = await c.env.DB.prepare(
    'SELECT user_id, role FROM auth_tokens WHERE token = ? AND (expires_at IS NULL OR expires_at > datetime("now"))'
  ).bind(token).first<{ user_id: string; role: string }>();

  if (!row) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('user', {
    userId: row.user_id,
    role: row.role,
    isAdmin: row.role === 'admin',
  });

  await next();
});

/** Middleware that requires admin role */
export const adminMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: { user: AuthUser };
}>(async (c, next) => {
  const user = c.get('user');
  if (!user?.isAdmin) {
    return c.json({ error: 'Admin required' }, 403);
  }
  await next();
});
