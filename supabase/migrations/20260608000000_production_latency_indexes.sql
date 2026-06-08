-- Add missing composite indexes to optimize production latency for Workspace Dashboard
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id_is_deleted ON public.tasks(workspace_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id_workspace_id ON public.workspace_members(user_id, workspace_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_task_participants_task_user ON public.task_participants(task_id, user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_parent_workspace_id ON public.workspaces(parent_workspace_id) WHERE is_deleted = false;
