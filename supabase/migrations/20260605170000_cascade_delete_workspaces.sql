-- 20260605170000_cascade_delete_workspaces.sql

-- Drop existing foreign keys
ALTER TABLE public.sub_workspaces DROP CONSTRAINT IF EXISTS sub_workspaces_workspace_id_fkey;
ALTER TABLE public.workspace_statistics DROP CONSTRAINT IF EXISTS workspace_statistics_workspace_id_fkey;
ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS workspace_members_workspace_id_fkey;
ALTER TABLE public.workspace_teams DROP CONSTRAINT IF EXISTS workspace_teams_workspace_id_fkey;
ALTER TABLE public.workspaces DROP CONSTRAINT IF EXISTS workspaces_parent_workspace_id_fkey;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_workspace_id_fkey;
ALTER TABLE public.sprints DROP CONSTRAINT IF EXISTS sprints_workspace_id_fkey;
ALTER TABLE public.task_templates DROP CONSTRAINT IF EXISTS task_templates_workspace_id_fkey;

-- Recreate with ON DELETE CASCADE
ALTER TABLE public.sub_workspaces 
  ADD CONSTRAINT sub_workspaces_workspace_id_fkey 
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.workspace_statistics 
  ADD CONSTRAINT workspace_statistics_workspace_id_fkey 
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.workspace_members 
  ADD CONSTRAINT workspace_members_workspace_id_fkey 
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.workspace_teams 
  ADD CONSTRAINT workspace_teams_workspace_id_fkey 
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.workspaces 
  ADD CONSTRAINT workspaces_parent_workspace_id_fkey 
  FOREIGN KEY (parent_workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_workspace_id_fkey 
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.sprints 
  ADD CONSTRAINT sprints_workspace_id_fkey 
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.task_templates 
  ADD CONSTRAINT task_templates_workspace_id_fkey 
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
