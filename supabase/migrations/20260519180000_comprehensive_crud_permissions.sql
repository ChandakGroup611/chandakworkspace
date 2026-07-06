-- ============================================================================
-- ADIOS PLATFORM MIGRATION - COMPREHENSIVE CRUD IAM PERMISSIONS & SCOPED RLS
-- ============================================================================

-- 1. Drop old triggers, policies, and tables
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS tr_refresh_ups_on_user_role ON public.user_roles;
DROP TRIGGER IF EXISTS tr_refresh_ups_on_role_perm ON public.role_permissions;
DROP TRIGGER IF EXISTS tr_refresh_ups_on_user_master ON public.user_master;
DROP TABLE IF EXISTS public.user_permissions_snapshot CASCADE;

-- 2. Create the new Multi-Row Scoped Permissions Snapshot
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_permissions_snapshot (
    user_id UUID NOT NULL REFERENCES public.user_master(id) ON DELETE CASCADE,
    permission_code TEXT NOT NULL,
    resource_scope TEXT DEFAULT 'global',
    workspace_scope UUID[] DEFAULT '{}',
    department_scope UUID[] DEFAULT '{}',
    company_scope UUID[] DEFAULT '{}',
    team_scope UUID[] DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, permission_code)
);

-- Enable RLS on Snapshot
ALTER TABLE public.user_permissions_snapshot ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_ups_select ON public.user_permissions_snapshot;
DROP POLICY IF EXISTS policy_ups_select ON public.user_permissions_snapshot;
CREATE POLICY policy_ups_select ON public.user_permissions_snapshot FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_super_admin()
);

-- Add to Realtime Publication
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_permissions_snapshot') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_permissions_snapshot;
    END IF;
END $$;

-- 3. Seed new CRUD + MANAGE permissions
-- ----------------------------------------------------------------------------
INSERT INTO public.permissions (code, name, module, submodule, action, resource_type) VALUES
  ('TICKETS_VIEW', 'View Operations Tickets', 'Tickets', 'ITSM Lifecycle', 'VIEW', 'PAGE'),
  ('TICKETS_CREATE', 'Create Service Tickets', 'Tickets', 'ITSM Lifecycle', 'CREATE', 'ACTION'),
  ('TICKETS_UPDATE', 'Modify Ticket Records', 'Tickets', 'ITSM Lifecycle', 'UPDATE', 'ACTION'),
  ('TICKETS_DELETE', 'Purge Ticket Data', 'Tickets', 'ITSM Lifecycle', 'DELETE', 'ACTION'),
  ('TICKETS_MANAGE', 'Full Ticket Governance', 'Tickets', 'ITSM Lifecycle', 'MANAGE', 'PAGE'),

  ('WORKSPACES_VIEW', 'View Workspace Hub', 'Workspaces', 'Execution Tasks', 'VIEW', 'PAGE'),
  ('WORKSPACES_CREATE', 'Initialize Workspaces', 'Workspaces', 'Execution Tasks', 'CREATE', 'ACTION'),
  ('WORKSPACES_UPDATE', 'Modify Workspaces', 'Workspaces', 'Execution Tasks', 'UPDATE', 'ACTION'),
  ('WORKSPACES_DELETE', 'Archive Workspaces', 'Workspaces', 'Execution Tasks', 'DELETE', 'ACTION'),
  ('WORKSPACES_MANAGE', 'Workspace Governance', 'Workspaces', 'Execution Tasks', 'MANAGE', 'PAGE'),

  ('TASKS_VIEW', 'View Tasks Flow', 'Tasks', 'Execution Tasks', 'VIEW', 'PAGE'),
  ('TASKS_CREATE', 'Create Tasks', 'Tasks', 'Execution Tasks', 'CREATE', 'ACTION'),
  ('TASKS_UPDATE', 'Modify Tasks state', 'Tasks', 'Execution Tasks', 'UPDATE', 'ACTION'),
  ('TASKS_DELETE', 'Delete Tasks', 'Tasks', 'Execution Tasks', 'DELETE', 'ACTION'),
  ('TASKS_MANAGE', 'Tasks Governance', 'Tasks', 'Execution Tasks', 'MANAGE', 'PAGE'),

  ('USERS_VIEW', 'View User Directory', 'Users', 'Personnel Registry', 'VIEW', 'PAGE'),
  ('USERS_CREATE', 'Register New Users', 'Users', 'Personnel Registry', 'CREATE', 'ACTION'),
  ('USERS_UPDATE', 'Modify Personnel Profiles', 'Users', 'Personnel Registry', 'UPDATE', 'ACTION'),
  ('USERS_DELETE', 'Deactivate Accounts', 'Users', 'Personnel Registry', 'DELETE', 'ACTION'),
  ('USERS_MANAGE', 'Full HR Governance', 'Users', 'Personnel Registry', 'MANAGE', 'PAGE'),

  ('IAM_VIEW', 'View Identity Controls', 'IAM', 'Security Registry', 'VIEW', 'PAGE'),
  ('IAM_CREATE', 'Create Security Policies', 'IAM', 'Security Registry', 'CREATE', 'ACTION'),
  ('IAM_UPDATE', 'Modify Access Rules', 'IAM', 'Security Registry', 'UPDATE', 'ACTION'),
  ('IAM_DELETE', 'Revoke Roles', 'IAM', 'Security Registry', 'DELETE', 'ACTION'),
  ('IAM_MANAGE', 'Manage Roles & Access', 'IAM', 'Security Registry', 'MANAGE', 'PAGE'),

  ('MASTERS_VIEW', 'View System Masters Config', 'Masters', 'Core Config', 'VIEW', 'PAGE'),
  ('MASTERS_CREATE', 'Create Master Entities', 'Masters', 'Core Config', 'CREATE', 'ACTION'),
  ('MASTERS_UPDATE', 'Modify Master Specs', 'Masters', 'Core Config', 'UPDATE', 'ACTION'),
  ('MASTERS_DELETE', 'Remove Master Data', 'Masters', 'Core Config', 'DELETE', 'ACTION'),
  ('MASTERS_MANAGE', 'Masters Governance', 'Masters', 'Core Config', 'MANAGE', 'PAGE'),

  ('SLA_VIEW', 'View SLA Rules', 'SLA', 'Service Levels', 'VIEW', 'PAGE'),
  ('SLA_CREATE', 'Create SLA Targets', 'SLA', 'Service Levels', 'CREATE', 'ACTION'),
  ('SLA_UPDATE', 'Modify SLA Metrics', 'SLA', 'Service Levels', 'UPDATE', 'ACTION'),
  ('SLA_DELETE', 'Delete SLA Schemes', 'SLA', 'Service Levels', 'DELETE', 'ACTION'),
  ('SLA_MANAGE', 'SLA Governance', 'SLA', 'Service Levels', 'MANAGE', 'PAGE'),

  ('COMPLIANCE_VIEW', 'View Compliance Audits', 'Compliance', 'Audit Registry', 'VIEW', 'PAGE'),
  ('COMPLIANCE_CREATE', 'Add Compliance Controls', 'Compliance', 'Audit Registry', 'CREATE', 'ACTION'),
  ('COMPLIANCE_UPDATE', 'Update Compliance Checks', 'Compliance', 'Audit Registry', 'UPDATE', 'ACTION'),
  ('COMPLIANCE_DELETE', 'Delete Compliance Logs', 'Compliance', 'Audit Registry', 'DELETE', 'ACTION'),
  ('COMPLIANCE_MANAGE', 'Compliance System Lead', 'Compliance', 'Audit Registry', 'MANAGE', 'PAGE'),

  ('REQUIREMENTS_VIEW', 'View Requirements engineering', 'Requirements', 'Requirements Trace', 'VIEW', 'PAGE'),
  ('REQUIREMENTS_CREATE', 'Initialize Requirements', 'Requirements', 'Requirements Trace', 'CREATE', 'ACTION'),
  ('REQUIREMENTS_UPDATE', 'Modify Requirements Specs', 'Requirements', 'Requirements Trace', 'UPDATE', 'ACTION'),
  ('REQUIREMENTS_DELETE', 'Archive Requirements', 'Requirements', 'Requirements Trace', 'DELETE', 'ACTION'),
  ('REQUIREMENTS_MANAGE', 'Requirements Governance', 'Requirements', 'Requirements Trace', 'MANAGE', 'PAGE')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  module = EXCLUDED.module,
  submodule = EXCLUDED.submodule,
  action = EXCLUDED.action,
  resource_type = EXCLUDED.resource_type;

-- 4. Snapshot Sync & Scopes Calculation Engine
-- ----------------------------------------------------------------------------
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
    -- 1. Wipe existing rows
    DELETE FROM public.user_permissions_snapshot WHERE user_id = p_user_id;

    -- 2. Compute scopes
    SELECT COALESCE(array_agg(DISTINCT workspace_id), '{}') INTO v_workspace_scope
    FROM (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = p_user_id
        UNION
        SELECT wt.workspace_id FROM public.workspace_teams wt 
        JOIN public.team_members tm ON wt.team_id = tm.team_id 
        WHERE tm.user_id = p_user_id
        UNION
        SELECT id as workspace_id FROM public.workspaces WHERE owner_id = p_user_id
    ) w;

    SELECT COALESCE(array_agg(DISTINCT department_id), '{}') INTO v_department_scope
    FROM public.user_department_access
    WHERE user_id = p_user_id;

    SELECT COALESCE(array_agg(DISTINCT team_id), '{}') INTO v_team_scope
    FROM public.team_members
    WHERE user_id = p_user_id;

    SELECT COALESCE(array_agg(DISTINCT w.company_id), '{}') INTO v_company_scope
    FROM public.workspaces w
    WHERE w.id = ANY(v_workspace_scope) AND w.company_id IS NOT NULL;

    -- 3. Resolve role permissions (joining user_master and user_roles to match either)
    SELECT COALESCE(array_agg(DISTINCT p.code), '{}') INTO v_permissions
    FROM (
        SELECT role_id FROM public.user_master WHERE id = p_user_id AND role_id IS NOT NULL
        UNION
        SELECT role_id FROM public.user_roles WHERE user_id = p_user_id
    ) ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id;

    -- 4. Repopulate snapshot for each permission
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

-- 5. Canonical SUPER_ADMIN helper + Permission Checker (Capability Inheritance Logic)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        WHERE um.id = auth.uid() AND r.code = 'SUPER_ADMIN'
    )
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.code = 'SUPER_ADMIN'
    )
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'SUPER_ADMIN';
END;
$$;

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

    -- 2. Fetch user's permissions snapshot
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
    -- Check VIEW inheritance (if checking _VIEW, can be matched by _CREATE, _UPDATE, _DELETE, _MANAGE)
    IF p_permission_code LIKE '%\_VIEW' ESCAPE '\' THEN
        v_base := substring(p_permission_code from 1 for position('_VIEW' in p_permission_code) - 1);
        RETURN (v_base || '_CREATE') = ANY(v_permissions)
            OR (v_base || '_UPDATE') = ANY(v_permissions)
            OR (v_base || '_DELETE') = ANY(v_permissions)
            OR (v_base || '_MANAGE') = ANY(v_permissions);
    
    -- Check MANAGE inheritance (if checking _CREATE, _UPDATE, _DELETE, can be matched by _MANAGE)
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

-- Redefine has_permission_snapshot for backwards-compatibility
CREATE OR REPLACE FUNCTION public.has_permission_snapshot(p_permission_code TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN public.check_user_permission(p_permission_code);
END;
$$;

-- 6. Role & Permission Mapping Seeding
-- ----------------------------------------------------------------------------
-- Map ALL permissions to SUPER_ADMIN and ROLE_ADMIN
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p 
WHERE r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
ON CONFLICT DO NOTHING;

-- Map basic permissions to ROLE_STAFF
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p 
WHERE r.code = 'ROLE_STAFF' AND p.code IN ('TICKETS_VIEW', 'TICKETS_CREATE', 'WORKSPACES_VIEW', 'TASKS_VIEW')
ON CONFLICT DO NOTHING;

-- 7. Snapshot Rebuilding Trigger Functions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_ups_on_user_role_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.refresh_single_user_permissions_snapshot(COALESCE(NEW.user_id, OLD.user_id));
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_refresh_ups_on_user_role ON public.user_roles;
CREATE TRIGGER tr_refresh_ups_on_user_role
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.refresh_ups_on_user_role_change();

CREATE OR REPLACE FUNCTION public.refresh_ups_on_user_master_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.refresh_single_user_permissions_snapshot(COALESCE(NEW.id, OLD.id));
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_refresh_ups_on_user_master ON public.user_master;
CREATE TRIGGER tr_refresh_ups_on_user_master
AFTER INSERT OR UPDATE OF role_id ON public.user_master
FOR EACH ROW EXECUTE FUNCTION public.refresh_ups_on_user_master_change();

CREATE OR REPLACE FUNCTION public.refresh_ups_on_role_perm_change()
RETURNS TRIGGER AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT id FROM public.user_master WHERE role_id = COALESCE(NEW.role_id, OLD.role_id)
        UNION
        SELECT user_id FROM public.user_roles WHERE role_id = COALESCE(NEW.role_id, OLD.role_id)
    ) LOOP
        PERFORM public.refresh_single_user_permissions_snapshot(r.id);
    END LOOP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_refresh_ups_on_role_perm ON public.role_permissions;
CREATE TRIGGER tr_refresh_ups_on_role_perm
AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION public.refresh_ups_on_role_perm_change();

-- Triggers for Workspace/Team/Department member changes
CREATE OR REPLACE FUNCTION public.refresh_ups_on_workspace_member_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.refresh_single_user_permissions_snapshot(COALESCE(NEW.user_id, OLD.user_id));
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_refresh_ups_on_workspace_member ON public.workspace_members;
CREATE TRIGGER tr_refresh_ups_on_workspace_member
AFTER INSERT OR UPDATE OR DELETE ON public.workspace_members
FOR EACH ROW EXECUTE FUNCTION public.refresh_ups_on_workspace_member_change();

CREATE OR REPLACE FUNCTION public.refresh_ups_on_team_member_change()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID := COALESCE(NEW.user_id, OLD.user_id);
BEGIN
    PERFORM public.refresh_single_user_permissions_snapshot(v_user_id);
    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'refresh_ups_on_team_member_change failed for user_id=%: %', v_user_id, SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_refresh_ups_on_team_member ON public.team_members;
CREATE TRIGGER tr_refresh_ups_on_team_member
AFTER INSERT OR UPDATE OR DELETE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.refresh_ups_on_team_member_change();

CREATE OR REPLACE FUNCTION public.refresh_ups_on_dept_access_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.refresh_single_user_permissions_snapshot(COALESCE(NEW.user_id, OLD.user_id));
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_refresh_ups_on_dept_access ON public.user_department_access;
CREATE TRIGGER tr_refresh_ups_on_dept_access
AFTER INSERT OR UPDATE OR DELETE ON public.user_department_access
FOR EACH ROW EXECUTE FUNCTION public.refresh_ups_on_dept_access_change();

-- 7.5 Redefine can_access_record with support for the new multi-row snapshot schema
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_record(
    p_creator_id UUID, 
    p_assignee_id UUID, 
    p_department_id UUID,
    p_resource_kind TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- RULE 1: SUPER_ADMIN sees everything
    IF public.is_super_admin() THEN
        RETURN TRUE;
    END IF;

    -- RULE 1.5: USERS_* permission snapshot holders see personnel records only
    IF p_resource_kind IS NOT NULL AND lower(p_resource_kind) = 'user' AND EXISTS (
        SELECT 1 FROM public.user_permissions_snapshot ups
        WHERE ups.user_id = auth.uid() 
        AND ups.permission_code IN ('USERS_MANAGE', 'USERS_VIEW', 'USERS_CREATE', 'USERS_UPDATE', 'USERS_DELETE')
    ) THEN RETURN TRUE; END IF;

    -- RULE 2: Ownership Check (Dynamic ID Check)
    IF auth.uid() = p_creator_id OR auth.uid() = p_assignee_id THEN RETURN TRUE; END IF;

    -- RULE 3: Management Check (Dynamic Department Join)
    IF EXISTS (
        SELECT 1 FROM public.departments d
        WHERE d.id = p_department_id AND d.manager_id = auth.uid()
    ) THEN RETURN TRUE; END IF;

    -- RULE 4: Secondary Manager Check (via user_department_access)
    IF EXISTS (
        SELECT 1 FROM public.user_department_access uda
        WHERE uda.user_id = auth.uid() AND uda.department_id = p_department_id AND uda.access_level = 'manager'
    ) THEN RETURN TRUE; END IF;

    RETURN FALSE;
END;
$$;

-- 8. Domain-specific Row Level Security (RLS) Policies
-- ----------------------------------------------------------------------------

-- A. ITSM Tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_unified_tickets ON public.tickets;
DROP POLICY IF EXISTS policy_tickets_select ON public.tickets;
DROP POLICY IF EXISTS policy_tickets_insert ON public.tickets;
DROP POLICY IF EXISTS policy_tickets_update ON public.tickets;
DROP POLICY IF EXISTS policy_tickets_delete ON public.tickets;

DROP POLICY IF EXISTS policy_tickets_select ON public.tickets;
CREATE POLICY policy_tickets_select ON public.tickets FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR (
        public.check_user_permission('TICKETS_VIEW') 
        AND public.can_access_record(creator_id, assignee_id, department_id)
    )
);

DROP POLICY IF EXISTS policy_tickets_insert ON public.tickets;
CREATE POLICY policy_tickets_insert ON public.tickets FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR public.check_user_permission('TICKETS_CREATE')
);

DROP POLICY IF EXISTS policy_tickets_update ON public.tickets;
CREATE POLICY policy_tickets_update ON public.tickets FOR UPDATE TO authenticated
USING (
    public.is_super_admin()
    OR (
        public.check_user_permission('TICKETS_UPDATE') 
        AND public.can_access_record(creator_id, assignee_id, department_id)
    )
)
WITH CHECK (
    public.is_super_admin()
    OR public.check_user_permission('TICKETS_UPDATE')
);

DROP POLICY IF EXISTS policy_tickets_delete ON public.tickets;
CREATE POLICY policy_tickets_delete ON public.tickets FOR DELETE TO authenticated
USING (
    public.is_super_admin()
);

-- B. Workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_workspaces_select ON public.workspaces;
DROP POLICY IF EXISTS policy_workspaces_insert ON public.workspaces;
DROP POLICY IF EXISTS policy_workspaces_update ON public.workspaces;
DROP POLICY IF EXISTS policy_workspaces_delete ON public.workspaces;

DROP POLICY IF EXISTS policy_workspaces_select ON public.workspaces;
CREATE POLICY policy_workspaces_select ON public.workspaces FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR (
        public.check_user_permission('WORKSPACES_VIEW') 
        AND public.is_workspace_member(id)
    )
);

DROP POLICY IF EXISTS policy_workspaces_insert ON public.workspaces;
CREATE POLICY policy_workspaces_insert ON public.workspaces FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR public.check_user_permission('WORKSPACES_CREATE')
);

DROP POLICY IF EXISTS policy_workspaces_update ON public.workspaces;
CREATE POLICY policy_workspaces_update ON public.workspaces FOR UPDATE TO authenticated
USING (
    public.is_super_admin()
    OR (
        public.check_user_permission('WORKSPACES_UPDATE') 
        AND public.is_workspace_member(id)
    )
)
WITH CHECK (
    public.is_super_admin()
    OR public.check_user_permission('WORKSPACES_UPDATE')
);

DROP POLICY IF EXISTS policy_workspaces_delete ON public.workspaces;
CREATE POLICY policy_workspaces_delete ON public.workspaces FOR DELETE TO authenticated
USING (
    public.is_super_admin()
);

-- C. Workspace Tasks
ALTER TABLE public.workspace_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_unified_tasks ON public.workspace_tasks;
DROP POLICY IF EXISTS policy_tasks_select ON public.workspace_tasks;
DROP POLICY IF EXISTS policy_tasks_insert ON public.workspace_tasks;
DROP POLICY IF EXISTS policy_tasks_update ON public.workspace_tasks;
DROP POLICY IF EXISTS policy_tasks_delete ON public.workspace_tasks;

DROP POLICY IF EXISTS policy_tasks_select ON public.workspace_tasks;
CREATE POLICY policy_tasks_select ON public.workspace_tasks FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR (
        public.check_user_permission('TASKS_VIEW') 
        AND public.is_task_member(id)
    )
);

DROP POLICY IF EXISTS policy_tasks_insert ON public.workspace_tasks;
CREATE POLICY policy_tasks_insert ON public.workspace_tasks FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR (
        public.check_user_permission('TASKS_CREATE') 
        AND public.is_workspace_member(workspace_id)
    )
);

DROP POLICY IF EXISTS policy_tasks_update ON public.workspace_tasks;
CREATE POLICY policy_tasks_update ON public.workspace_tasks FOR UPDATE TO authenticated
USING (
    public.is_super_admin()
    OR (
        public.check_user_permission('TASKS_UPDATE') 
        AND public.is_task_member(id)
    )
)
WITH CHECK (
    public.is_super_admin()
    OR public.check_user_permission('TASKS_UPDATE')
);

DROP POLICY IF EXISTS policy_tasks_delete ON public.workspace_tasks;
CREATE POLICY policy_tasks_delete ON public.workspace_tasks FOR DELETE TO authenticated
USING (
    public.is_super_admin()
);

-- D. User Directory (Personnel Master)
ALTER TABLE public.user_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_unified_personnel ON public.user_master;
DROP POLICY IF EXISTS policy_user_master_ultimate ON public.user_master;
DROP POLICY IF EXISTS policy_users_select ON public.user_master;
DROP POLICY IF EXISTS policy_users_insert ON public.user_master;
DROP POLICY IF EXISTS policy_users_update ON public.user_master;
DROP POLICY IF EXISTS policy_users_delete ON public.user_master;

DROP POLICY IF EXISTS policy_users_select ON public.user_master;
CREATE POLICY policy_users_select ON public.user_master FOR SELECT TO authenticated
USING (
    id = auth.uid()
    OR public.is_super_admin()
    OR (
        public.check_user_permission('USERS_VIEW') 
        AND public.can_access_record(id, manager_id, department_id, 'user')
    )
);

DROP POLICY IF EXISTS policy_users_insert ON public.user_master;
CREATE POLICY policy_users_insert ON public.user_master FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR public.check_user_permission('USERS_CREATE')
);

DROP POLICY IF EXISTS policy_users_update ON public.user_master;
CREATE POLICY policy_users_update ON public.user_master FOR UPDATE TO authenticated
USING (
    id = auth.uid() 
    OR public.is_super_admin()
    OR (
        public.check_user_permission('USERS_UPDATE') 
        AND public.can_access_record(id, manager_id, department_id, 'user')
    )
)
WITH CHECK (
    id = auth.uid() 
    OR public.is_super_admin()
    OR public.check_user_permission('USERS_UPDATE')
);

DROP POLICY IF EXISTS policy_users_delete ON public.user_master;
CREATE POLICY policy_users_delete ON public.user_master FOR DELETE TO authenticated
USING (
    public.is_super_admin()
);

-- E. Requirements
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_unified_requirements ON public.requirements;
DROP POLICY IF EXISTS policy_requirements_select ON public.requirements;
DROP POLICY IF EXISTS policy_requirements_insert ON public.requirements;
DROP POLICY IF EXISTS policy_requirements_update ON public.requirements;
DROP POLICY IF EXISTS policy_requirements_delete ON public.requirements;

DROP POLICY IF EXISTS policy_requirements_select ON public.requirements;
CREATE POLICY policy_requirements_select ON public.requirements FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR (
        public.check_user_permission('REQUIREMENTS_VIEW') 
        AND public.can_access_record(creator_id, NULL, department_id)
    )
);

DROP POLICY IF EXISTS policy_requirements_insert ON public.requirements;
CREATE POLICY policy_requirements_insert ON public.requirements FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR public.check_user_permission('REQUIREMENTS_CREATE')
);

DROP POLICY IF EXISTS policy_requirements_update ON public.requirements;
CREATE POLICY policy_requirements_update ON public.requirements FOR UPDATE TO authenticated
USING (
    public.is_super_admin()
    OR (
        public.check_user_permission('REQUIREMENTS_UPDATE') 
        AND public.can_access_record(creator_id, NULL, department_id)
    )
)
WITH CHECK (
    public.is_super_admin()
    OR public.check_user_permission('REQUIREMENTS_UPDATE')
);

DROP POLICY IF EXISTS policy_requirements_delete ON public.requirements;
CREATE POLICY policy_requirements_delete ON public.requirements FOR DELETE TO authenticated
USING (
    public.is_super_admin()
);

-- F. Custom Field Definitions
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_cfd_select ON public.custom_field_definitions;
DROP POLICY IF EXISTS policy_cfd_insert ON public.custom_field_definitions;
DROP POLICY IF EXISTS policy_cfd_update ON public.custom_field_definitions;
DROP POLICY IF EXISTS policy_cfd_delete ON public.custom_field_definitions;

DROP POLICY IF EXISTS policy_cfd_select ON public.custom_field_definitions;
CREATE POLICY policy_cfd_select ON public.custom_field_definitions FOR SELECT TO authenticated
USING (NOT is_deleted);

DROP POLICY IF EXISTS policy_cfd_insert ON public.custom_field_definitions;
CREATE POLICY policy_cfd_insert ON public.custom_field_definitions FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR public.check_user_permission('TASKS_MANAGE') 
    OR public.check_user_permission('CUSTOM_FIELDS_CREATE')
);

DROP POLICY IF EXISTS policy_cfd_update ON public.custom_field_definitions;
CREATE POLICY policy_cfd_update ON public.custom_field_definitions FOR UPDATE TO authenticated
USING (
    public.is_super_admin()
    OR public.check_user_permission('TASKS_MANAGE') 
    OR public.check_user_permission('CUSTOM_FIELDS_CREATE')
);

-- 9. Initialize snapshots for existing records
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    u RECORD;
BEGIN
    FOR u IN (SELECT id FROM public.user_master) LOOP
        BEGIN
            PERFORM public.refresh_single_user_permissions_snapshot(u.id);
            EXCEPTION WHEN OTHERS THEN NULL; -- Gracefully skip single user errors during initial seeding
        END;
    END LOOP;
END;
$$;
