-- ============================================================================
-- ADIOS PLATFORM: Consolidated Database Schema & RLS Policy Repair
-- ============================================================================

-- PART 0: Repair legacy user_permissions_snapshot schema and remove stale helpers
-- This repair ensures any old snapshot schema or function references are rebuilt
-- with the new row-based permission snapshot model, which is required for
-- user_master updates and RLS enforcement.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_permissions_snapshot'
          AND column_name = 'permissions'
    ) THEN
        ALTER TABLE public.user_permissions_snapshot DROP COLUMN permissions;
    END IF;
EXCEPTION WHEN undefined_table THEN
    -- If the snapshot table does not exist yet, that is fine.
    NULL;
END $$;

DROP TRIGGER IF EXISTS tr_refresh_ups_on_user_role ON public.user_roles;
DROP TRIGGER IF EXISTS tr_refresh_ups_on_role_perm ON public.role_permissions;
DROP TRIGGER IF EXISTS tr_refresh_ups_on_user_master ON public.user_master;
DROP TRIGGER IF EXISTS tr_refresh_ups_on_workspace_member ON public.workspace_members;
DROP TRIGGER IF EXISTS tr_refresh_ups_on_team_member ON public.team_members;
DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.refresh_user_permissions_snapshot_on_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_user_permissions_snapshot_on_role_perm() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_sync() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_single_user_permissions_snapshot(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.check_user_permission(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.has_permission_snapshot(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_record(UUID, UUID, UUID) CASCADE;

DROP TABLE IF EXISTS public.user_permissions_snapshot CASCADE;

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

ALTER TABLE public.user_permissions_snapshot ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_ups_select ON public.user_permissions_snapshot;
CREATE POLICY policy_ups_select ON public.user_permissions_snapshot FOR SELECT TO authenticated USING (true);

-- Rebuild any known helper functions after table re-creation.
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
    DELETE FROM public.user_permissions_snapshot WHERE user_id = p_user_id;

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

    SELECT COALESCE(array_agg(DISTINCT p.code), '{}') INTO v_permissions
    FROM (
        SELECT role_id FROM public.user_master WHERE id = p_user_id AND role_id IS NOT NULL
        UNION
        SELECT role_id FROM public.user_roles WHERE user_id = p_user_id
    ) ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id;

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

CREATE OR REPLACE FUNCTION public.has_permission_snapshot(p_permission_code TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN public.check_user_permission(p_permission_code);
END;
$$;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.user_master LOOP
        PERFORM public.refresh_single_user_permissions_snapshot(r.id);
    END LOOP;
END $$;

-- PART 1: Repair user_master Foreign Keys
-- Clean up orphaned references if any exist to ensure safe constraint addition
UPDATE public.user_master
SET department_id = NULL
WHERE department_id IS NOT NULL 
  AND department_id NOT IN (SELECT id FROM public.departments);

UPDATE public.user_master
SET designation_id = NULL
WHERE designation_id IS NOT NULL 
  AND designation_id NOT IN (SELECT id FROM public.designations);

UPDATE public.user_master
SET role_id = NULL
WHERE role_id IS NOT NULL 
  AND role_id NOT IN (SELECT id FROM public.roles);

-- Add foreign key constraints back to user_master
ALTER TABLE public.user_master
    DROP CONSTRAINT IF EXISTS fk_user_master_department,
    DROP CONSTRAINT IF EXISTS fk_user_master_designation,
    DROP CONSTRAINT IF EXISTS fk_user_master_role;

ALTER TABLE public.user_master
    ADD CONSTRAINT fk_user_master_department 
    FOREIGN KEY (department_id) 
    REFERENCES public.departments(id) 
    ON DELETE SET NULL;

ALTER TABLE public.user_master
    ADD CONSTRAINT fk_user_master_designation 
    FOREIGN KEY (designation_id) 
    REFERENCES public.designations(id) 
    ON DELETE SET NULL;

ALTER TABLE public.user_master
    ADD CONSTRAINT fk_user_master_role 
    FOREIGN KEY (role_id) 
    REFERENCES public.roles(id) 
    ON DELETE SET NULL;


-- PART 2: Repair notification_queue Schema & Setup Compatibility Sync
-- Add missing columns to notification_queue if they don't exist
ALTER TABLE public.notification_queue 
    ADD COLUMN IF NOT EXISTS entity_type TEXT,
    ADD COLUMN IF NOT EXISTS entity_id TEXT,
    ADD COLUMN IF NOT EXISTS module TEXT DEFAULT 'tickets',
    ADD COLUMN IF NOT EXISTS action_type TEXT,
    ADD COLUMN IF NOT EXISTS actor TEXT,
    ADD COLUMN IF NOT EXISTS target_user_id TEXT,
    ADD COLUMN IF NOT EXISTS redirect_url TEXT,
    ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'MEDIUM';

-- Make recipient_id nullable to support global broadcast notifications (e.g., target_user_id = 'GLOBAL_OPS')
ALTER TABLE public.notification_queue 
    ALTER COLUMN recipient_id DROP NOT NULL;

-- Define BEFORE INSERT trigger to sync fields and handle payload extraction
CREATE OR REPLACE FUNCTION public.tr_sync_notification_queue_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract values from JSONB payload if they are not directly provided
    IF NEW.payload IS NOT NULL THEN
        NEW.entity_id := COALESCE(NEW.entity_id, NEW.payload ->> 'code', NEW.payload ->> 'ticket_id');
        NEW.action_type := COALESCE(NEW.action_type, NEW.payload ->> 'type');
        NEW.actor := COALESCE(NEW.actor, NEW.payload ->> 'actor', 'System');
        
        -- Infer redirect url if not provided
        IF NEW.redirect_url IS NULL AND NEW.payload ->> 'ticket_id' IS NOT NULL THEN
            NEW.redirect_url := '/tickets?id=' || (NEW.payload ->> 'ticket_id');
        END IF;
    END IF;

    -- Defaults
    NEW.entity_type := COALESCE(NEW.entity_type, 'ticket');
    NEW.module := COALESCE(NEW.module, 'tickets');
    NEW.action_type := COALESCE(NEW.action_type, 'mutate');
    NEW.actor := COALESCE(NEW.actor, 'System');
    NEW.redirect_url := COALESCE(NEW.redirect_url, '/');
    NEW.priority_level := COALESCE(NEW.priority_level, 'MEDIUM');

    -- Sync recipient_id to target_user_id if needed
    IF NEW.target_user_id IS NULL AND NEW.recipient_id IS NOT NULL THEN
        NEW.target_user_id := NEW.recipient_id::text;
    END IF;

    -- Sync target_user_id to recipient_id if it's a valid UUID
    IF NEW.recipient_id IS NULL AND NEW.target_user_id IS NOT NULL THEN
        BEGIN
            NEW.recipient_id := NEW.target_user_id::uuid;
        EXCEPTION WHEN others THEN
            -- If it's a code like 'GLOBAL_OPS', leave recipient_id as NULL
            NEW.recipient_id := NULL;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_notification_queue_sync ON public.notification_queue;
CREATE TRIGGER tr_notification_queue_sync
    BEFORE INSERT ON public.notification_queue
    FOR EACH ROW
    EXECUTE FUNCTION public.tr_sync_notification_queue_fields();


-- PART 3: Redefine handle_new_user & Drop Legacy Trigger Functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_master (
        id, 
        full_name, 
        user_code,
        email, 
        role_id,
        is_active,
        is_deleted
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Unnamed User'),
        COALESCE(
            NEW.raw_user_meta_data ->> 'user_code', 
            'USR-' || upper(substring(NEW.id::text from 1 for 8))
        ),
        NEW.email,
        (SELECT id FROM public.roles WHERE code = 'ROLE_STAFF'),
        TRUE,
        FALSE
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        is_deleted = FALSE,
        is_active = TRUE;

    -- Call the modern schema-compliant snapshot refresh function
    PERFORM public.refresh_single_user_permissions_snapshot(NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Explicitly drop legacy trigger functions referencing obsolete permissions column
DROP FUNCTION IF EXISTS public.refresh_user_permissions_snapshot_on_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_user_permissions_snapshot_on_role_perm() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_sync() CASCADE;

-- Ensure auth.users triggers are clean and strictly AFTER INSERT calling handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;

CREATE TRIGGER tr_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- PART 4: Redefine Core Security Helper Functions (Schema-Compliant & Bulletproof)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        WHERE um.id = auth.uid() AND r.code = 'SUPER_ADMIN'
    ) OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.code = 'SUPER_ADMIN'
    ) OR (
        COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'SUPER_ADMIN'
    );
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

CREATE OR REPLACE FUNCTION public.can_access_record(
    p_creator_id UUID, 
    p_assignee_id UUID, 
    p_department_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- RULE 1: SUPER_ADMIN bypass
    IF public.is_super_admin() THEN
        RETURN TRUE;
    END IF;

    -- RULE 1.5: USERS_MANAGE/USERS_UPDATE/USERS_VIEW permission snapshot holders see personnel
    IF public.check_user_permission('USERS_MANAGE') 
       OR public.check_user_permission('USERS_UPDATE') 
       OR public.check_user_permission('USERS_VIEW') 
    THEN
        RETURN TRUE;
    END IF;

    -- RULE 2: Ownership Check
    IF auth.uid() = p_creator_id OR auth.uid() = p_assignee_id THEN
        RETURN TRUE;
    END IF;

    -- RULE 3: Management Check
    IF EXISTS (
        SELECT 1 FROM public.departments d
        WHERE d.id = p_department_id AND d.manager_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- RULE 4: Secondary Manager Check
    IF EXISTS (
        SELECT 1 FROM public.user_department_access uda
        WHERE uda.user_id = auth.uid() AND uda.department_id = p_department_id AND uda.access_level = 'manager'
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;


-- PART 5: Drop Legacy Policies and Reinstate Clean user_master RLS Policies
-- Drop all legacy policies that could refer to obsolete columns or triggers
DROP POLICY IF EXISTS policy_user_master_select ON public.user_master;
DROP POLICY IF EXISTS policy_user_master_select_v2 ON public.user_master;
DROP POLICY IF EXISTS policy_user_master_mutate ON public.user_master;
DROP POLICY IF EXISTS policy_user_master_update ON public.user_master;
DROP POLICY IF EXISTS policy_unified_personnel ON public.user_master;
DROP POLICY IF EXISTS policy_users_select ON public.user_master;
DROP POLICY IF EXISTS policy_users_update ON public.user_master;
DROP POLICY IF EXISTS policy_users_insert ON public.user_master;
DROP POLICY IF EXISTS policy_users_delete ON public.user_master;
DROP POLICY IF EXISTS policy_user_master_ultimate ON public.user_master;
DROP POLICY IF EXISTS policy_ups_all ON public.user_permissions_snapshot;

-- Recreate policy_ups_select to allow reading permissions snapshot
DROP POLICY IF EXISTS policy_ups_select ON public.user_permissions_snapshot;
CREATE POLICY policy_ups_select ON public.user_permissions_snapshot FOR SELECT TO authenticated USING (true);

-- Ensure RLS is enabled on user_master
ALTER TABLE public.user_master ENABLE ROW LEVEL SECURITY;

-- Reinstate SELECT policy
CREATE POLICY policy_users_select ON public.user_master FOR SELECT TO authenticated
USING (
    id = auth.uid()
    OR public.is_super_admin()
    OR public.check_user_permission('USERS_VIEW')
    OR public.can_access_record(id, manager_id, department_id)
);

-- Reinstate UPDATE policy
-- RULE: Only self user OR SUPER_ADMIN can update their own profile.
--       Staff with USERS_UPDATE permission may update OTHER users' records
--       (subject to can_access_record scope), but CANNOT escalate or override
--       their own profile beyond the self-edit branch.
CREATE POLICY policy_users_update ON public.user_master FOR UPDATE TO authenticated
USING (
    -- Branch 1: Self — any authenticated user may edit their own record
    id = auth.uid()
    -- Branch 2: SUPER_ADMIN — unrestricted access over all rows
    OR public.is_super_admin()
    -- Branch 3: Delegated — staff with USERS_UPDATE can update OTHER users
    --           only if they can access that user's record via scope check
    OR (
        id <> auth.uid()
        AND public.check_user_permission('USERS_UPDATE')
        AND public.can_access_record(id, manager_id, department_id)
    )
)
WITH CHECK (
    -- Mirror USING exactly so the write-side check is consistent
    id = auth.uid()
    OR public.is_super_admin()
    OR (
        id <> auth.uid()
        AND public.check_user_permission('USERS_UPDATE')
        AND public.can_access_record(id, manager_id, department_id)
    )
);

-- Reinstate INSERT policy for administrative user provisioning
CREATE POLICY policy_users_insert ON public.user_master FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR public.check_user_permission('USERS_CREATE')
);

-- Reinstate DELETE policy
CREATE POLICY policy_users_delete ON public.user_master FOR DELETE TO authenticated
USING (
    public.is_super_admin()
    OR public.check_user_permission('USERS_DELETE')
);
