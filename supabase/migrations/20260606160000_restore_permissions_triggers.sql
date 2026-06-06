-- Migration to restore scope calculation, recreate permissions snapshot triggers, and sync snapshots for all users.

-- 1. Drop the redundant trigger that syncs user master role directly to permissions snapshot with blank/empty scopes
DROP TRIGGER IF EXISTS tr_sync_master_role ON public.user_master;

-- 2. Redefine refresh_single_user_permissions_snapshot to calculate scopes correctly using workspace_owner_id
CREATE OR REPLACE FUNCTION public.refresh_single_user_permissions_snapshot(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
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

    -- F. Resolve all permissions from user_master's direct role AND user_roles mappings
    SELECT COALESCE(array_agg(DISTINCT p.code), '{}') INTO v_permissions
    FROM (
        SELECT role_id FROM public.user_master WHERE id = p_user_id AND role_id IS NOT NULL
        UNION
        SELECT role_id FROM public.user_roles WHERE user_id = p_user_id
    ) ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id;

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
$$;

-- 3. Create trigger to refresh snapshot when user_roles changes
DROP TRIGGER IF EXISTS tr_refresh_ups_on_user_role ON public.user_roles;
CREATE TRIGGER tr_refresh_ups_on_user_role
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.refresh_ups_on_user_role_change();

-- 4. Create trigger to refresh snapshot when role_permissions changes
DROP TRIGGER IF EXISTS tr_refresh_ups_on_role_perm ON public.role_permissions;
CREATE TRIGGER tr_refresh_ups_on_role_perm
AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION public.refresh_ups_on_role_perm_change();

-- 5. Create trigger to refresh snapshot when user_master's role_id is modified
DROP TRIGGER IF EXISTS tr_refresh_ups_on_user_master ON public.user_master;
CREATE TRIGGER tr_refresh_ups_on_user_master
AFTER UPDATE OF role_id ON public.user_master
FOR EACH ROW EXECUTE FUNCTION public.refresh_ups_on_user_master_change();

-- 6. Create trigger to refresh snapshot when workspace_members changes
DROP TRIGGER IF EXISTS tr_refresh_ups_on_workspace_member ON public.workspace_members;
CREATE TRIGGER tr_refresh_ups_on_workspace_member
AFTER INSERT OR UPDATE OR DELETE ON public.workspace_members
FOR EACH ROW EXECUTE FUNCTION public.refresh_ups_on_workspace_member_change();

-- 7. Create trigger to refresh snapshot when team_members changes
DROP TRIGGER IF EXISTS tr_refresh_ups_on_team_member ON public.team_members;
CREATE TRIGGER tr_refresh_ups_on_team_member
AFTER INSERT OR UPDATE OR DELETE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.refresh_ups_on_team_member_change();

-- 8. Create trigger function and trigger for workspaces table to refresh snapshot on workspace owner change
CREATE OR REPLACE FUNCTION public.refresh_ups_on_workspace_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.workspace_owner_id IS NOT NULL THEN
        PERFORM public.refresh_single_user_permissions_snapshot(NEW.workspace_owner_id);
    END IF;
    IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.workspace_owner_id IS NOT NULL THEN
        PERFORM public.refresh_single_user_permissions_snapshot(OLD.workspace_owner_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_refresh_ups_on_workspace ON public.workspaces;
CREATE TRIGGER tr_refresh_ups_on_workspace
AFTER INSERT OR UPDATE OF workspace_owner_id OR DELETE ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.refresh_ups_on_workspace_change();

-- 9. Run a one-time permissions snapshot sync for all existing users to compute correct scopes
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.user_master LOOP
        BEGIN
            PERFORM public.refresh_single_user_permissions_snapshot(r.id);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to refresh permissions snapshot for user %: %', r.id, SQLERRM;
        END;
    END LOOP;
END $$;
