-- =========================================================================
-- UP MIGRATION: 20261119100000_wp2_task_status_integrity.sql
-- Master Programme WP2 (2.6, 2.7, 2.8) & Decisions D4, D5
-- =========================================================================

-- 1. Create backup tables before modifying live data
CREATE TABLE IF NOT EXISTS public.backup_status_master_20261119 AS
SELECT * FROM public.status_master WHERE scope_type = 'TASK';

CREATE TABLE IF NOT EXISTS public.backup_tasks_20261119 AS
SELECT * FROM public.tasks WHERE status_id = 'b74ee75a-7f62-4123-a101-32b6313de2a0';

-- 2. D5: Make the 12 TASK statuses global (scope_id = NULL)
UPDATE public.status_master
SET scope_id = NULL, updated_at = NOW()
WHERE scope_type = 'TASK' AND scope_id = 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3';

-- 3. D4: Order statuses: open-type first, in-progress, hold, review, closed last
UPDATE public.status_master SET status_order = 1, is_default = true, is_reopen = false, updated_at = NOW() WHERE id = 'e6a4e794-b694-45a1-a55d-4baaed5062f9'; -- NEW
UPDATE public.status_master SET status_order = 2, is_default = false, is_reopen = false, updated_at = NOW() WHERE id = 'dd403fda-9278-4c1c-b352-da53379b2e62'; -- TO DO
UPDATE public.status_master SET status_order = 3, is_default = false, is_reopen = true, updated_at = NOW() WHERE id = '090dc19c-98cd-4512-8a10-e0220918cf69'; -- WORK INPROGRESS
UPDATE public.status_master SET status_order = 4, is_default = false, is_reopen = false, updated_at = NOW() WHERE id = '942f7eb5-3064-4519-95e7-1f1524a4764e'; -- REPLIED
UPDATE public.status_master SET status_order = 5, is_default = false, is_reopen = false, updated_at = NOW() WHERE id = '975bb464-ad18-4b9d-aa80-1d69e0a073d6'; -- FOLLOW UP
UPDATE public.status_master SET status_order = 6, is_default = false, is_reopen = false, updated_at = NOW() WHERE id = 'dc495497-4d84-498f-81bb-aa618197f0f6'; -- HOLD
UPDATE public.status_master SET status_order = 7, is_default = false, is_reopen = false, updated_at = NOW() WHERE id = 'f499ada2-9354-49ff-8635-e39672546eea'; -- NEED TO CHECK
UPDATE public.status_master SET status_order = 8, is_default = false, is_reopen = false, updated_at = NOW() WHERE id = '7eed0d94-0195-4bdf-b960-5b83fcc4ca7e'; -- ACTION CANNOT BE DONE
UPDATE public.status_master SET status_order = 9, is_default = false, is_reopen = false, updated_at = NOW() WHERE id = '80b1b70c-028b-48e3-b1d9-b3391c31b9e5'; -- ACTION NOT REQUIRED
UPDATE public.status_master SET status_order = 10, is_default = false, is_reopen = false, updated_at = NOW() WHERE id = '3392636b-59ff-4d04-b103-55d2cb9c6b27'; -- CLOSED
UPDATE public.status_master SET status_order = 11, is_default = false, is_reopen = false, updated_at = NOW() WHERE id = '63ed2aee-a3d8-4084-a470-94ccda56973a'; -- RESOLVED (deleted)
UPDATE public.status_master SET status_order = 12, is_default = false, is_reopen = false, updated_at = NOW() WHERE id = 'b74ee75a-7f62-4123-a101-32b6313de2a0'; -- TASK COMPLETED (deleted)

-- 4. WP2 2.8: Move tasks pointing at deleted "Task Completed" status to matching active "Closed" status
UPDATE public.tasks
SET status_id = '3392636b-59ff-4d04-b103-55d2cb9c6b27', updated_at = NOW()
WHERE status_id = 'b74ee75a-7f62-4123-a101-32b6313de2a0';
