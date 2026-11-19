-- =========================================================================
-- DOWN MIGRATION: 20261119110000_wp3_tickets_requirements_integrity_down.sql
-- Master Programme WP3 (Item 3.5)
-- Revert Data Remediation for Tickets and Requirements Status Consistency
-- =========================================================================

-- 1. Revert requirements
UPDATE public.requirements r
SET status_id = b.status_id, updated_at = NOW()
FROM public.backup_requirements_wp3_20261119 b
WHERE r.id = b.id;

-- 2. Revert tickets
UPDATE public.tickets t
SET status_id = b.status_id, updated_at = NOW()
FROM public.backup_tickets_wp3_20261119 b
WHERE t.id = b.id;
