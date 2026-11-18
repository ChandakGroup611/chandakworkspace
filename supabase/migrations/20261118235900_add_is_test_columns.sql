-- Additive columns for testing sandbox and data isolation governance
ALTER TABLE user_master ADD COLUMN IF NOT EXISTS is_test_user BOOLEAN DEFAULT false;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;
