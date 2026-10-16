-- Migration: Intake form
-- Adds intake_tokens table for onboarding intake forms

CREATE TABLE IF NOT EXISTS intake_tokens (
  token TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  prefill_json TEXT NOT NULL DEFAULT '{}',
  response_json TEXT DEFAULT NULL,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL DEFAULT (datetime('now', '+14 days')),
  submitted_at TEXT DEFAULT NULL
);

-- Index for admin listing (status filter, newest first)
CREATE INDEX IF NOT EXISTS idx_intake_status ON intake_tokens(status, created_at);
