-- =========================================================================
-- DOWN MIGRATION: 20261119100000_wp2_task_status_integrity_down.sql
-- Rollback for Master Programme WP2 (2.6, 2.7, 2.8)
-- =========================================================================

-- 1. Restore tasks status_id from backup
UPDATE public.tasks t
SET status_id = b.status_id, updated_at = NOW()
FROM public.backup_tasks_20261119 b
WHERE t.id = b.id;

-- 2. Restore status_master attributes from backup
UPDATE public.status_master s
SET scope_id = b.scope_id,
    status_order = b.status_order,
    is_default = b.is_default,
    is_reopen = b.is_reopen,
    updated_at = NOW()
FROM public.backup_status_master_20261119 b
WHERE s.id = b.id;
