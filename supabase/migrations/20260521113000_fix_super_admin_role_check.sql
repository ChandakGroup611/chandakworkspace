-- 20260521113000_fix_super_admin_role_check.sql
-- Fixes issue where System Administrators (ROLE_ADMIN) were blocked from universal access
-- because is_super_admin() was strictly checking only for 'SUPER_ADMIN'.

-- 1. Fix is_super_admin to include ROLE_ADMIN which is functionally a System Administrator
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- 1. Fast Path: JWT Claim check
    IF COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('SUPER_ADMIN', 'ROLE_ADMIN') THEN
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
        WHERE ur.user_id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
    ) THEN
        PERFORM set_config('adios.is_super_admin_check', '0', true);
        RETURN TRUE;
    END IF;

    -- 3. Fallback: Check base role in user_master
    IF EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
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

-- 2. Update user_master policy to allow ROLE_ADMIN to bypass globally
DROP POLICY IF EXISTS policy_super_admin_bypass_all ON public.user_master;
DROP POLICY IF EXISTS policy_super_admin_bypass_all ON public.user_master;
CREATE POLICY policy_super_admin_bypass_all ON public.user_master
FOR ALL TO authenticated
USING (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('SUPER_ADMIN', 'ROLE_ADMIN')
    OR (current_setting('adios.is_super_admin_check', true) IS DISTINCT FROM '1' AND public.is_super_admin())
)
WITH CHECK (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('SUPER_ADMIN', 'ROLE_ADMIN')
    OR (current_setting('adios.is_super_admin_check', true) IS DISTINCT FROM '1' AND public.is_super_admin())
);
