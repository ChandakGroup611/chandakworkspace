-- ============================================================================
-- ADIOS UNIFIED GOVERNANCE CONSTITUTION - AUTOMATED REPAIR
-- ============================================================================

-- 1. THE ZERO-RECURSION ACCESS HELPER
CREATE OR REPLACE FUNCTION public.can_access_unified(
    p_creator_id UUID, 
    p_assignee_id UUID DEFAULT NULL, 
    p_department_id UUID DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
    SELECT (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'SUPER_ADMIN'
        OR auth.uid() = p_creator_id 
        OR auth.uid() = p_assignee_id
    );
$$;

-- 2. ENFORCE ACROSS ALL MODULES
ALTER TABLE public.user_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "policy_user_master_ultimate" ON public.user_master;
CREATE POLICY "policy_user_master_ultimate" ON public.user_master FOR ALL TO authenticated 
USING (id = auth.uid() OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'SUPER_ADMIN');

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "policy_tickets_unified" ON public.tickets;
CREATE POLICY "policy_tickets_unified" ON public.tickets FOR ALL TO authenticated 
USING (public.can_access_unified(created_by, NULL));

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "policy_workspaces_unified" ON public.workspaces;
CREATE POLICY "policy_workspaces_unified" ON public.workspaces FOR ALL TO authenticated 
USING (public.can_access_unified(created_by, NULL));

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "policy_tasks_unified" ON public.tasks;
CREATE POLICY "policy_tasks_unified" ON public.tasks FOR ALL TO authenticated 
USING (public.can_access_unified(created_by, assignee_id));

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "policy_masters_admin" ON public.departments;
CREATE POLICY "policy_masters_admin" ON public.departments FOR ALL TO authenticated 
USING (TRUE) WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'SUPER_ADMIN');

-- 3. PERMISSION SEEDING
INSERT INTO public.permissions (code, name, module, action) VALUES
    ('MASTERS_VIEW', 'View Registry', 'Masters', 'VIEW'),
    ('SLA_VIEW', 'View SLA', 'SLA', 'VIEW'),
    ('COMPLIANCE_VIEW', 'Access Compliance', 'Compliance', 'VIEW'),
    ('REQUIREMENTS_VIEW', 'View Requirements', 'Requirements', 'VIEW')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p WHERE r.code = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

-- 4. IDENTITY SYNC TRIGGER
CREATE OR REPLACE FUNCTION public.sync_user_role_to_auth()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE auth.users 
    SET raw_app_metadata = jsonb_set(COALESCE(raw_app_metadata, '{}'::jsonb), '{role}', to_jsonb((SELECT code FROM public.roles WHERE id = NEW.role_id)))
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_user_role ON public.user_master;
CREATE TRIGGER tr_sync_user_role AFTER INSERT OR UPDATE OF role_id ON public.user_master FOR EACH ROW EXECUTE FUNCTION public.sync_user_role_to_auth();

-- 5. BOOTSTRAP ADMIN
UPDATE public.user_master SET role_id = (SELECT id FROM public.roles WHERE code = 'SUPER_ADMIN') WHERE email = 'avinash2@gmail.com';
