-- ============================================================================
-- FIX: Ensure SUPER_ADMIN Users Have Complete Permission Snapshot
-- ============================================================================
-- Issue: SUPER_ADMIN users without properly seeded permissions_snapshot 
--        are denied access to operations that should be allowed
-- Solution: Rebuild permissions snapshot for all SUPER_ADMIN users
-- ============================================================================

-- 1. Find all SUPER_ADMIN users and rebuild their permission snapshots
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT DISTINCT um.id
        FROM public.user_master um
        JOIN public.roles ro ON um.role_id = ro.id
        WHERE ro.code = 'SUPER_ADMIN'
        
        UNION
        
        SELECT DISTINCT ur.user_id
        FROM public.user_roles ur
        JOIN public.roles ro ON ur.role_id = ro.id
        WHERE ro.code = 'SUPER_ADMIN'
    ) LOOP
        PERFORM public.refresh_single_user_permissions_snapshot(r.id);
    END LOOP;
END $$;

-- 2. Ensure all permissions are mapped to SUPER_ADMIN role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.code = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

-- 3. Log the result
DO $$
DECLARE
    v_super_admin_count INTEGER;
    v_perm_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT um.id) INTO v_super_admin_count
    FROM public.user_master um
    JOIN public.roles ro ON um.role_id = ro.id
    WHERE ro.code = 'SUPER_ADMIN';
    
    SELECT COUNT(*) INTO v_perm_count
    FROM public.permissions;
    
    RAISE NOTICE 'SUPER_ADMIN Permission Sync: % SUPER_ADMIN users, % total permissions', 
        v_super_admin_count, v_perm_count;
END $$;
