-- ==============================================================================
-- Migration: User-Wise Dashboard Access & Permissions Sync
--  1. Update refresh_single_user_permissions_snapshot to pull permissions from
--     dashboard_user_access (giving users granular dashboard access).
--  2. Add trigger on dashboard_user_access to automatically refresh the user's
--     permission snapshot whenever dashboard assignments change.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.refresh_single_user_permissions_snapshot(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_workspace_scope UUID[];
    v_department_scope UUID[];
    v_team_scope UUID[];
    v_company_scope UUID[];
    v_permissions TEXT[];
    v_perm_code TEXT;
BEGIN
    -- A. Wipe existing rows for this user
    DELETE FROM public.user_permissions_snapshot WHERE user_id = p_user_id;

    -- B. Compute workspace scopes (memberships, teams, or owner)
    SELECT COALESCE(array_agg(DISTINCT workspace_id), '{}') INTO v_workspace_scope
    FROM (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = p_user_id
        UNION
        SELECT wt.workspace_id FROM public.workspace_teams wt 
        JOIN public.team_members tm ON wt.team_id = tm.team_id 
        WHERE tm.user_id = p_user_id
        UNION
        SELECT id as workspace_id FROM public.workspaces WHERE workspace_owner_id = p_user_id
    ) w;

    -- C. Compute department scopes
    SELECT COALESCE(array_agg(DISTINCT department_id), '{}') INTO v_department_scope
    FROM public.user_department_access
    WHERE user_id = p_user_id;

    -- D. Compute team scopes
    SELECT COALESCE(array_agg(DISTINCT team_id), '{}') INTO v_team_scope
    FROM public.team_members
    WHERE user_id = p_user_id;

    -- E. Compute company scopes
    SELECT COALESCE(array_agg(DISTINCT w.company_id), '{}') INTO v_company_scope
    FROM public.workspaces w
    WHERE w.id = ANY(v_workspace_scope) AND w.company_id IS NOT NULL;

    -- F. Resolve all permissions from:
    --    1. user_master's direct role AND user_roles mappings joined to role_permissions
    --    2. user-wise dashboard assignments in dashboard_user_access
    SELECT COALESCE(array_agg(DISTINCT perm), '{}') INTO v_permissions
    FROM (
        SELECT p.code as perm
        FROM (
            SELECT role_id FROM public.user_master WHERE id = p_user_id AND role_id IS NOT NULL
            UNION
            SELECT role_id FROM public.user_roles WHERE user_id = p_user_id
        ) ur
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        UNION
        SELECT 'DASH_' || UPPER(dashboard_key) || '_VIEW' as perm
        FROM public.dashboard_user_access
        WHERE user_id = p_user_id
        UNION
        SELECT 'DASH_' || UPPER(dashboard_key) || '_DETAILS' as perm
        FROM public.dashboard_user_access
        WHERE user_id = p_user_id
        UNION
        SELECT 'DASH_' || UPPER(dashboard_key) || '_EXPORT' as perm
        FROM public.dashboard_user_access
        WHERE user_id = p_user_id
        UNION
        SELECT 'DASH_' || UPPER(dashboard_key) || '_CHAT' as perm
        FROM public.dashboard_user_access
        WHERE user_id = p_user_id
        UNION
        SELECT 'DASH_' || UPPER(dashboard_key) || '_SCHEDULE' as perm
        FROM public.dashboard_user_access
        WHERE user_id = p_user_id
    ) perms_sub;

    -- G. Repopulate snapshot for each permission with calculated scopes
    IF array_length(v_permissions, 1) > 0 THEN
        FOREACH v_perm_code IN ARRAY v_permissions
        LOOP
            INSERT INTO public.user_permissions_snapshot (
                user_id, permission_code, resource_scope, workspace_scope, department_scope, company_scope, team_scope, updated_at
            ) VALUES (
                p_user_id,
                v_perm_code,
                'global',
                v_workspace_scope,
                v_department_scope,
                v_company_scope,
                v_team_scope,
                now()
            ) ON CONFLICT (user_id, permission_code) DO NOTHING;
        END LOOP;
    END IF;
END;
$function$;

-- Trigger to automatically refresh permissions when dashboard_user_access changes
CREATE OR REPLACE FUNCTION public.trigger_refresh_permissions_on_dashboard_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.refresh_single_user_permissions_snapshot(COALESCE(NEW.user_id, OLD.user_id));
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_dashboard_user_access_refresh_perms ON public.dashboard_user_access;
CREATE TRIGGER trg_dashboard_user_access_refresh_perms
AFTER INSERT OR UPDATE OR DELETE ON public.dashboard_user_access
FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_permissions_on_dashboard_access();

