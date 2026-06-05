-- ==============================================================================
-- FIX ALL SERIES NUMBERS
-- Resets all workspaces, sub-workspaces, tasks, and sub-tasks to the correct series codes
-- ==============================================================================

-- 1. Truncate the tracker to ensure we start from 0001
TRUNCATE TABLE public.series_tracker;

-- 2. Update Workspaces
UPDATE public.workspaces
SET workspace_code = public.generate_series_code('WS')
WHERE parent_workspace_id IS NULL;

-- 3. Update Sub-Workspaces
UPDATE public.workspaces
SET workspace_code = public.generate_series_code('SWS')
WHERE parent_workspace_id IS NOT NULL;

-- 4. Update Tasks
UPDATE public.tasks
SET task_code = public.generate_series_code('TSK')
WHERE parent_task_id IS NULL;

-- 5. Update Sub-Tasks
UPDATE public.tasks
SET task_code = public.generate_series_code('STK')
WHERE parent_task_id IS NOT NULL;
