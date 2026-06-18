-- Migration: Add last_active_at column to user_master for server-side heartbeat tracking
-- This column is updated by POST /api/heartbeat every 60 seconds while the user's tab is active.
-- A user is considered "online" if last_active_at is within the last 2 minutes.

ALTER TABLE user_master ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();

-- Index for efficient presence queries (e.g. "who is online?")
CREATE INDEX IF NOT EXISTS idx_user_master_last_active_at ON user_master (last_active_at DESC);

-- Backfill: set existing users' last_active_at to their last_login_at if available
UPDATE user_master 
SET last_active_at = COALESCE(last_login_at, created_at, now()) 
WHERE last_active_at IS NULL;
