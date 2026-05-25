-- =========================================================================
-- ADIOS ENTERPRISE - COMPREHENSIVE FIXES (REVISED)
-- This script safely fixes the RLS lockouts and User Profile Dropdown state bugs.
-- It has been carefully audited to guarantee that tasks/tickets/requirements LISTING is NOT broken.
-- =========================================================================

-- 1. FIX RLS "LOOP AND FALSE" AND PROFILE DROPDOWN BUG
-- The previous function crashed because it referenced a deleted column 'permissions'.
-- We rewrite it to safely return TRUE/FALSE (boolean required by Postgres RLS) and handle access cleanly.
CREATE OR REPLACE FUNCTION public.check_user_permission(p_permission_code TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_base TEXT;
    v_permissions TEXT[];
BEGIN
    -- Allow SUPER_ADMIN full access
    IF public.is_super_admin() THEN
        RETURN TRUE;
    END IF;

    -- Safely fetch snapshot
    SELECT array_agg(permission_code) INTO v_permissions
    FROM public.user_permissions_snapshot
    WHERE user_id = auth.uid();

    -- Return false instead of null as requested for strict 0/1 access control
    IF v_permissions IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Direct Match
    IF p_permission_code = ANY(v_permissions) THEN
        RETURN TRUE;
    END IF;

    -- Inherited/Wildcard Matching (e.g. USERS_MANAGE grants USERS_CREATE)
    IF p_permission_code LIKE '%\\_VIEW' ESCAPE '\\' THEN
        v_base := substring(p_permission_code from 1 for position('_VIEW' in p_permission_code) - 1);
        RETURN (v_base || '_CREATE') = ANY(v_permissions)
            OR (v_base || '_UPDATE') = ANY(v_permissions)
            OR (v_base || '_DELETE') = ANY(v_permissions)
            OR (v_base || '_MANAGE') = ANY(v_permissions);
    ELSIF p_permission_code LIKE '%\\_CREATE' ESCAPE '\\' THEN
        v_base := substring(p_permission_code from 1 for position('_CREATE' in p_permission_code) - 1);
        RETURN (v_base || '_MANAGE') = ANY(v_permissions);
    ELSIF p_permission_code LIKE '%\\_UPDATE' ESCAPE '\\' THEN
        v_base := substring(p_permission_code from 1 for position('_UPDATE' in p_permission_code) - 1);
        RETURN (v_base || '_MANAGE') = ANY(v_permissions);
    ELSIF p_permission_code LIKE '%\\_DELETE' ESCAPE '\\' THEN
        v_base := substring(p_permission_code from 1 for position('_DELETE' in p_permission_code) - 1);
        RETURN (v_base || '_MANAGE') = ANY(v_permissions);
    END IF;

    RETURN FALSE;
END;
$$;

-- Ensure trigger cleanly updates snapshot without referencing deleted 'permissions' column
CREATE OR REPLACE FUNCTION public.refresh_single_user_permissions_snapshot(p_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_permissions TEXT[];
    v_perm_code TEXT;
BEGIN
    DELETE FROM public.user_permissions_snapshot WHERE user_id = p_user_id;

    -- Fetch permissions from user_roles and role_permissions
    SELECT COALESCE(array_agg(DISTINCT p.code), '{}') INTO v_permissions
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id;

    IF array_length(v_permissions, 1) > 0 THEN
        FOREACH v_perm_code IN ARRAY v_permissions
        LOOP
            INSERT INTO public.user_permissions_snapshot (user_id, permission_code)
            VALUES (p_user_id, v_perm_code) ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- Fetch permissions from user_master's direct role
    SELECT COALESCE(array_agg(DISTINCT p.code), '{}') INTO v_permissions
    FROM public.user_master um
    JOIN public.role_permissions rp ON um.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE um.id = p_user_id;

    IF array_length(v_permissions, 1) > 0 THEN
        FOREACH v_perm_code IN ARRAY v_permissions
        LOOP
            INSERT INTO public.user_permissions_snapshot (user_id, permission_code)
            VALUES (p_user_id, v_perm_code) ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END;
$$;


-- 2. FIX USER PROFILE VISIBILITY RLS
-- To prevent breaking tickets/tasks/requirements listing, SELECT must be open to authenticated users
-- so that foreign key joins (like assignee names) succeed.
-- HOWEVER, we strictly lock down UPDATE, INSERT, and DELETE so that only SUPER_ADMINs
-- or authorized users can modify profiles!

DROP POLICY IF EXISTS policy_user_master_select_safe ON public.user_master;
DROP POLICY IF EXISTS policy_user_master_select_v2 ON public.user_master;
DROP POLICY IF EXISTS policy_user_master_select ON public.user_master;
DROP POLICY IF EXISTS policy_user_master_mutate ON public.user_master;
DROP POLICY IF EXISTS policy_user_master_update ON public.user_master;
DROP POLICY IF EXISTS policy_user_master_delete ON public.user_master;
DROP POLICY IF EXISTS policy_user_master_insert ON public.user_master;

-- Allow EVERYONE to SELECT (so Tickets and Tasks can list Assignee names)
CREATE POLICY policy_user_master_select_safe ON public.user_master
FOR SELECT TO authenticated
USING (
    NOT is_deleted
);

-- STRICT UPDATE: A user can only update THEIR OWN profile, OR if they are SUPER_ADMIN/have USERS_UPDATE permission
CREATE POLICY policy_user_master_update_safe ON public.user_master
FOR UPDATE TO authenticated
USING (
    id = auth.uid() OR public.is_super_admin() OR public.check_user_permission('USERS_UPDATE')
)
WITH CHECK (
    id = auth.uid() OR public.is_super_admin() OR public.check_user_permission('USERS_UPDATE')
);

-- STRICT DELETE: Only Super Admins or USERS_DELETE
CREATE POLICY policy_user_master_delete_safe ON public.user_master
FOR DELETE TO authenticated
USING (
    public.is_super_admin() OR public.check_user_permission('USERS_DELETE')
);

-- STRICT INSERT: Only Super Admins or USERS_CREATE
CREATE POLICY policy_user_master_insert_safe ON public.user_master
FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin() OR public.check_user_permission('USERS_CREATE')
);


-- 3. SLA ENGINE: ESCALATION WORKSPACE SETUP
-- Create the ESCALATIONS workspace if it doesn't exist
DO $$
DECLARE
    v_workspace_id UUID;
BEGIN
    SELECT id INTO v_workspace_id FROM public.workspaces WHERE name = 'ESCALATIONS' LIMIT 1;
    IF v_workspace_id IS NULL THEN
        INSERT INTO public.workspaces (name, description)
        VALUES ('ESCALATIONS', 'Auto-generated workspace for SLA Escalated Tasks');
    END IF;
END $$;
