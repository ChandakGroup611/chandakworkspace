-- Down Migration: 20261119130000_wp5_trash_orphan_repair_down.sql
-- Description: Revert WP5 5.6 orphan repair from backup tables

-- 1. Restore delete_batches status from backup
UPDATE public.delete_batches b
SET status = bk.status
FROM public.backup_delete_batches_20261119 bk
WHERE b.id = bk.id;

-- 2. Clear legacy delete_batch_ids
UPDATE public.tasks
SET delete_batch_id = NULL
WHERE delete_batch_id = 'a0000000-0000-0000-0000-000000000001';

UPDATE public.requirements
SET delete_batch_id = NULL
WHERE delete_batch_id = 'a0000000-0000-0000-0000-000000000002';

UPDATE public.user_master
SET delete_batch_id = NULL
WHERE delete_batch_id = 'a0000000-0000-0000-0000-000000000003';

UPDATE public.status_master
SET delete_batch_id = NULL
WHERE delete_batch_id = 'a0000000-0000-0000-0000-000000000004';

-- 3. Remove legacy tracking batches
DELETE FROM public.delete_batches
WHERE id IN (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004'
);

-- 4. Drop backup tables
DROP TABLE IF EXISTS public.backup_delete_batches_20261119;
DROP TABLE IF EXISTS public.backup_tasks_trash_20261119;
DROP TABLE IF EXISTS public.backup_requirements_trash_20261119;
DROP TABLE IF EXISTS public.backup_user_master_trash_20261119;
DROP TABLE IF EXISTS public.backup_status_master_trash_20261119;
