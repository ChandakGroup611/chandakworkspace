-- 1. Drop any lingering legacy triggers and functions that might be referencing the old column
DROP FUNCTION IF EXISTS public.refresh_user_permissions_snapshot_on_user_master() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_user_permissions_snapshot_on_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_user_permissions_snapshot_on_role_perm() CASCADE;

-- 2. Forcefully replace check_user_permission to use the correct schema (permission_code array_agg)
CREATE OR REPLACE FUNCTION public.check_user_permission(p_permission_code TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_base TEXT;
    v_permissions TEXT[];
BEGIN
    -- 1. SUPER_ADMIN bypass
    IF public.is_super_admin() THEN
        RETURN TRUE;
    END IF;

    -- 2. Fetch user's permissions snapshot safely (NO 'permissions' column reference!)
    SELECT array_agg(permission_code) INTO v_permissions
    FROM public.user_permissions_snapshot
    WHERE user_id = auth.uid();

    IF v_permissions IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 3. Direct match
    IF p_permission_code = ANY(v_permissions) THEN
        RETURN TRUE;
    END IF;

    -- 4. Inherited permissions
    IF p_permission_code LIKE '%\_VIEW' ESCAPE '\' THEN
        v_base := substring(p_permission_code from 1 for position('_VIEW' in p_permission_code) - 1);
        RETURN (v_base || '_CREATE') = ANY(v_permissions)
            OR (v_base || '_UPDATE') = ANY(v_permissions)
            OR (v_base || '_DELETE') = ANY(v_permissions)
            OR (v_base || '_MANAGE') = ANY(v_permissions);
    ELSIF p_permission_code LIKE '%\_CREATE' ESCAPE '\' THEN
        v_base := substring(p_permission_code from 1 for position('_CREATE' in p_permission_code) - 1);
        RETURN (v_base || '_MANAGE') = ANY(v_permissions);
    ELSIF p_permission_code LIKE '%\_UPDATE' ESCAPE '\' THEN
        v_base := substring(p_permission_code from 1 for position('_UPDATE' in p_permission_code) - 1);
        RETURN (v_base || '_MANAGE') = ANY(v_permissions);
    ELSIF p_permission_code LIKE '%\_DELETE' ESCAPE '\' THEN
        v_base := substring(p_permission_code from 1 for position('_DELETE' in p_permission_code) - 1);
        RETURN (v_base || '_MANAGE') = ANY(v_permissions);
    END IF;

    RETURN FALSE;
END;
$$;
