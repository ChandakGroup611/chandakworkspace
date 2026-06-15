-- ============================================================================
-- PHASE C2.1: IAM DYNAMIC BACKFILL
-- Dynamically sources all available permissions from permissions_master
-- and assigns them to every active SUPER_ADMIN and ROLE_ADMIN.
-- Safe to re-run (ON CONFLICT DO NOTHING).
-- ============================================================================

INSERT INTO public.user_permissions_snapshot (user_id, permission_code)
SELECT u.id, p.code
FROM public.user_master u
JOIN public.roles r ON u.role_id = r.id
CROSS JOIN public.permissions p
WHERE r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
  AND u.is_deleted = false
ON CONFLICT (user_id, permission_code) DO NOTHING;
