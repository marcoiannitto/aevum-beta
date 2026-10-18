/**
 * Cloudflare Worker environment bindings.
 */

export interface Env {
  DB: D1Database;
  ALLOWED_ORIGIN: string;
  ADMIN_TOKEN: string;
  AI_WORKER_URL?: string;
  ANTHROPIC_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
}
