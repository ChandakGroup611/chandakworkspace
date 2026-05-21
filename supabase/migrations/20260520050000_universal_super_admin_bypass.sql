-- ============================================================================
-- ADIOS PLATFORM: Universal SUPER_ADMIN Bypass & IAM Optimization
-- ============================================================================

-- PART 1: Optimize is_super_admin() to prevent infinite RLS recursion
-- By evaluating the JWT claim first, we allow SUPER_ADMIN queries to short-circuit
-- before executing any queries against tables that rely on is_super_admin() in their own policies.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- 1. Fast Path: JWT Claim check
    -- This avoids triggering any database queries and circumvents RLS recursion instantly.
    IF COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'SUPER_ADMIN' THEN
        RETURN TRUE;
    END IF;

    -- 2. Fallback: Check explicitly assigned user_roles 
    IF EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.code = 'SUPER_ADMIN'
    ) THEN
        RETURN TRUE;
    END IF;

    -- 3. Fallback: Check base role in user_master
    -- We evaluate this last to minimize potential recursive triggers if BYPASSRLS is missing.
    IF EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        WHERE um.id = auth.uid() AND r.code = 'SUPER_ADMIN'
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- PART 1.5: Fix Legacy "permissions" Column References in Permission Checker
-- Overwrites any reverted broken versions (e.g. from fix-perms.sql) 
-- that try to query the removed "permissions" column instead of "permission_code".
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

    -- 2. Fetch user's permissions snapshot (using array_agg on permission_code rows)
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


-- PART 2: Apply Universal SUPER_ADMIN Override
-- Creates a generic 'FOR ALL' policy on every table in the 'public' schema to guarantee
-- that SUPER_ADMIN can execute any CRUD operation, resolving all missing/restricted permissions.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP
        BEGIN
            -- Drop the policy if it exists to ensure idempotency
            EXECUTE format('DROP POLICY IF EXISTS policy_super_admin_bypass_all ON public.%I', r.tablename);
            
            -- Create the overriding universal bypass policy
            EXECUTE format('
                CREATE POLICY policy_super_admin_bypass_all ON public.%I 
                FOR ALL TO authenticated 
                USING (public.is_super_admin()) 
                WITH CHECK (public.is_super_admin())', r.tablename);
        EXCEPTION
            WHEN OTHERS THEN
                -- Safely handle exceptions for system/locked tables if any occur
                RAISE NOTICE 'Failed to create bypass policy on %: %', r.tablename, SQLERRM;
        END;
    END LOOP;
END;
$$;
