-- Per-user config overrides.
-- Allows user-specific settings on top of the global config table.
-- Key/value pairs scoped to a user_id.

CREATE TABLE IF NOT EXISTS user_config (
  user_id    TEXT NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, key)
);
