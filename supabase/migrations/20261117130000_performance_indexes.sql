-- Performance Indexes for Workspace Task Trees, Dashboard Metrics, and Tickets
-- Approved by System Owner on 2026-11-17

-- 1. Accelerates workspace task tree queries (prevents table scans on tasks)
CREATE INDEX IF NOT EXISTS idx_tasks_ws_deleted_created 
  ON public.tasks(workspace_id, is_deleted, created_at DESC);

-- 2. Accelerates assignee filtering for dashboard KPIs
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_deleted 
  ON public.tasks(assigned_to, is_deleted);

-- 3. Accelerates multi-assignee task participant joins
CREATE INDEX IF NOT EXISTS idx_task_participants_task_user 
  ON public.task_participants(task_id, user_id);

-- 4. Accelerates batch checklist retrieval for workspace task tables
CREATE INDEX IF NOT EXISTS idx_task_checklists_task_id 
  ON public.task_checklists(task_id);

-- 5. Accelerates workspace membership lookups
CREATE INDEX IF NOT EXISTS idx_ws_members_user_deleted 
  ON public.workspace_members(user_id, is_deleted);

-- 6. GIN index for custom field queries on tickets
CREATE INDEX IF NOT EXISTS idx_tickets_custom_fields_gin 
  ON public.tickets USING GIN (custom_fields);
