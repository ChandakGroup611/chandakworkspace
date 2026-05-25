-- Add workspace_id and parent_task_id to workspace_tasks
ALTER TABLE public.workspace_tasks
  ADD COLUMN workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  ADD COLUMN parent_task_id UUID REFERENCES public.workspace_tasks(id);

-- Optional: create index for workspace_id
CREATE INDEX idx_workspace_tasks_workspace_id ON public.workspace_tasks(workspace_id);

-- Optional: create index for parent_task_id
CREATE INDEX idx_workspace_tasks_parent_task_id ON public.workspace_tasks(parent_task_id);
