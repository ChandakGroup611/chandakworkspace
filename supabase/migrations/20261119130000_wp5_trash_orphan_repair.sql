-- Migration: 20261119130000_wp5_trash_orphan_repair.sql
-- Description: WP5 5.6 - Repair orphan delete batches and assign batch tracking to legacy soft-deleted rows

-- 1. Create backup tables before modifying live data
CREATE TABLE IF NOT EXISTS public.backup_delete_batches_20261119 AS
SELECT * FROM public.delete_batches WHERE id = '91741c85-c3ea-4082-9a12-16848060ad27';

CREATE TABLE IF NOT EXISTS public.backup_tasks_trash_20261119 AS
SELECT * FROM public.tasks WHERE is_deleted = TRUE AND delete_batch_id IS NULL;

CREATE TABLE IF NOT EXISTS public.backup_requirements_trash_20261119 AS
SELECT * FROM public.requirements WHERE is_deleted = TRUE AND delete_batch_id IS NULL;

CREATE TABLE IF NOT EXISTS public.backup_user_master_trash_20261119 AS
SELECT * FROM public.user_master WHERE is_deleted = TRUE AND delete_batch_id IS NULL;

CREATE TABLE IF NOT EXISTS public.backup_status_master_trash_20261119 AS
SELECT * FROM public.status_master WHERE is_deleted = TRUE AND delete_batch_id IS NULL;

-- 2. Mark phantom orphan batch (root workspace missing) as PURGED
UPDATE public.delete_batches
SET status = 'PURGED'
WHERE id = '91741c85-c3ea-4082-9a12-16848060ad27'
  AND status = 'ACTIVE';

-- 3. Insert tracking batches for legacy soft-deleted records
INSERT INTO public.delete_batches (id, root_entity_type, root_entity_id, status, reason, deleted_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'TASK', 'a0000000-0000-0000-0000-000000000001', 'ACTIVE', 'Legacy soft-deleted tasks archive', NOW()),
  ('a0000000-0000-0000-0000-000000000002', 'REQUIREMENT', 'a0000000-0000-0000-0000-000000000002', 'ACTIVE', 'Legacy soft-deleted requirements archive', NOW()),
  ('a0000000-0000-0000-0000-000000000003', 'USER_MASTER', 'a0000000-0000-0000-0000-000000000003', 'ACTIVE', 'Legacy soft-deleted users archive', NOW()),
  ('a0000000-0000-0000-0000-000000000004', 'STATUS_MASTER', 'a0000000-0000-0000-0000-000000000004', 'ACTIVE', 'Legacy soft-deleted statuses archive', NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Ensure validate_task_assignment trigger only validates active, non-deleted tasks
CREATE OR REPLACE FUNCTION public.validate_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    v_is_valid BOOLEAN;
BEGIN
    -- Only validate assignment for active, non-deleted tasks
    IF NEW.is_deleted = false AND NEW.assigned_to IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = NEW.workspace_id 
            AND user_id = NEW.assigned_to
            AND is_deleted = false
        ) INTO v_is_valid;

        IF NOT v_is_valid THEN
            RAISE EXCEPTION 'Assignment Violation: Task assignee must be an active member of the corresponding workspace.';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

-- 5. Associate legacy soft-deleted records with their respective tracking batches
UPDATE public.tasks
SET delete_batch_id = 'a0000000-0000-0000-0000-000000000001',
    deleted_at = COALESCE(deleted_at, updated_at, NOW())
WHERE is_deleted = TRUE AND delete_batch_id IS NULL;

UPDATE public.requirements
SET delete_batch_id = 'a0000000-0000-0000-0000-000000000002',
    deleted_at = COALESCE(deleted_at, updated_at, NOW())
WHERE is_deleted = TRUE AND delete_batch_id IS NULL;

UPDATE public.user_master
SET delete_batch_id = 'a0000000-0000-0000-0000-000000000003',
    deleted_at = COALESCE(deleted_at, updated_at, NOW())
WHERE is_deleted = TRUE AND delete_batch_id IS NULL;

UPDATE public.status_master
SET delete_batch_id = 'a0000000-0000-0000-0000-000000000004',
    deleted_at = COALESCE(deleted_at, updated_at, NOW())
WHERE is_deleted = TRUE AND delete_batch_id IS NULL;
