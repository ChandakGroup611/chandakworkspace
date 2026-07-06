-- ============================================================================
-- ADIOS UNIFIED GOVERNANCE - GLOBAL REBUILD (DYNAMIC VERSION)
-- ============================================================================

-- 1. THE UNIVERSAL ACCESS HELPER (DYNAMIC)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_record(
    p_creator_id UUID, 
    p_assignee_id UUID, 
    p_department_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- RULE 1: SUPER_ADMIN sees everything (Dynamic Role Check)
    IF EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.code = 'SUPER_ADMIN'
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

-- 2. APPLY TO ALL DOMAINS (Personnel, Tickets, Tasks, Requirements)
-- ----------------------------------------------------------------------------

-- Personnel (User Master)
ALTER TABLE public.user_master ENABLE ROW LEVEL SECURITY;
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_master' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.user_master';
    END LOOP;
END $$;
DROP POLICY IF EXISTS "policy_unified_personnel" ON public.user_master;
DROP POLICY IF EXISTS "policy_unified_personnel" ON public.user_master;
CREATE POLICY "policy_unified_personnel" ON public.user_master FOR ALL TO authenticated USING (
    public.can_access_record(id, manager_id, department_id)
);

-- Tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "policy_unified_tickets" ON public.tickets;
DROP POLICY IF EXISTS "policy_unified_tickets" ON public.tickets;
DROP POLICY IF EXISTS "policy_unified_tickets" ON public.tickets;
CREATE POLICY "policy_unified_tickets" ON public.tickets FOR ALL TO authenticated USING (
    public.can_access_record(creator_id, assignee_id, department_id)
);

-- Tasks
ALTER TABLE public.workspace_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "policy_unified_tasks" ON public.workspace_tasks;
DROP POLICY IF EXISTS "policy_unified_tasks" ON public.workspace_tasks;
DROP POLICY IF EXISTS "policy_unified_tasks" ON public.workspace_tasks;
CREATE POLICY "policy_unified_tasks" ON public.workspace_tasks FOR ALL TO authenticated USING (
    public.can_access_record(creator_id, assignee_id, department_id)
);

-- Requirements
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "policy_unified_requirements" ON public.requirements;
DROP POLICY IF EXISTS "policy_unified_requirements" ON public.requirements;
DROP POLICY IF EXISTS "policy_unified_requirements" ON public.requirements;
CREATE POLICY "policy_unified_requirements" ON public.requirements FOR ALL TO authenticated USING (
    public.can_access_record(creator_id, NULL, department_id)
);

-- 3. DYNAMIC IDENTITY TRIGGER (AUTO-PROVISIONING)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.user_master (id, full_name, email, user_code, is_active, is_deleted)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Personnel-' || substring(NEW.id::text from 1 for 4)),
        NEW.email,
        'USR-' || substring(NEW.id::text from 1 for 8),
        TRUE,
        FALSE
    ) ON CONFLICT (id) DO UPDATE SET 
        email = EXCLUDED.email,
        is_deleted = false,
        is_active = true;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;
CREATE TRIGGER tr_on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_sync();
