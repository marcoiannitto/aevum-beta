-- Migration: Add intake_token column to users table
-- Links users created from intake form submissions back to their intake token

ALTER TABLE users ADD COLUMN intake_token TEXT DEFAULT NULL;

-- Index for lookup from admin intake detail
CREATE INDEX IF NOT EXISTS idx_users_intake_token ON users(intake_token);
