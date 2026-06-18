-- Performance optimizations for the Workspaces module
-- Add composite indexes to speed up RLS policies and backend visibility queries

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members (user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members (user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_teams_team_id ON workspace_teams (team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks (workspace_id);
