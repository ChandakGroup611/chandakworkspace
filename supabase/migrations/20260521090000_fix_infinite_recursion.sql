-- 20260521090000_fix_infinite_recursion.sql
-- Fixes infinite recursion caused by universal super admin bypass

-- Drop the bypass policy on core tables that are queried inside is_super_admin()
DROP POLICY IF EXISTS policy_super_admin_bypass_all ON public.user_master;
DROP POLICY IF EXISTS policy_super_admin_bypass_all ON public.roles;
DROP POLICY IF EXISTS policy_super_admin_bypass_all ON public.user_roles;
DROP POLICY IF EXISTS policy_super_admin_bypass_all ON public.user_permissions_snapshot;

-- Recreate them using ONLY the JWT claim check to completely avoid recursion
DROP POLICY IF EXISTS policy_super_admin_bypass_all ON public.user_master;
CREATE POLICY policy_super_admin_bypass_all ON public.user_master
FOR ALL TO authenticated
USING (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'SUPER_ADMIN')
WITH CHECK (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'SUPER_ADMIN');

DROP POLICY IF EXISTS policy_super_admin_bypass_all ON public.roles;
CREATE POLICY policy_super_admin_bypass_all ON public.roles
FOR ALL TO authenticated
USING (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'SUPER_ADMIN')
WITH CHECK (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'SUPER_ADMIN');

DROP POLICY IF EXISTS policy_super_admin_bypass_all ON public.user_roles;
CREATE POLICY policy_super_admin_bypass_all ON public.user_roles
FOR ALL TO authenticated
USING (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'SUPER_ADMIN')
WITH CHECK (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'SUPER_ADMIN');

DROP POLICY IF EXISTS policy_super_admin_bypass_all ON public.user_permissions_snapshot;
CREATE POLICY policy_super_admin_bypass_all ON public.user_permissions_snapshot
FOR ALL TO authenticated
USING (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'SUPER_ADMIN')
WITH CHECK (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'SUPER_ADMIN');

-- Also optimize is_super_admin() to prevent any other recursive edge cases
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- 1. Fast Path: JWT Claim check
    IF COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'SUPER_ADMIN' THEN
        RETURN TRUE;
    END IF;

    -- Prevent recursion by checking a local transaction variable
    IF current_setting('adios.is_super_admin_check', true) = '1' THEN
        RETURN FALSE;
    END IF;

    -- Set the flag
    PERFORM set_config('adios.is_super_admin_check', '1', true);

    -- 2. Fallback: Check explicitly assigned user_roles 
    IF EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.code = 'SUPER_ADMIN'
    ) THEN
        PERFORM set_config('adios.is_super_admin_check', '0', true);
        RETURN TRUE;
    END IF;

    -- 3. Fallback: Check base role in user_master
    IF EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        WHERE um.id = auth.uid() AND r.code = 'SUPER_ADMIN'
    ) THEN
        PERFORM set_config('adios.is_super_admin_check', '0', true);
        RETURN TRUE;
    END IF;

    PERFORM set_config('adios.is_super_admin_check', '0', true);
    RETURN FALSE;
EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('adios.is_super_admin_check', '0', true);
    RETURN FALSE;
END;
$$;
