-- Sprint 1: Production Audit and Indexes
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS workspace_type TEXT DEFAULT 'WORKSPACE';

-- Indexes for workspaces
CREATE INDEX IF NOT EXISTS idx_workspace_parent_id ON public.workspaces(parent_workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_type ON public.workspaces(workspace_type);
CREATE INDEX IF NOT EXISTS idx_workspace_deleted ON public.workspaces(is_deleted);

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS idx_task_workspace_id ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_parent_task_id ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_task_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_task_owner_id ON public.tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_task_deleted ON public.tasks(is_deleted);
