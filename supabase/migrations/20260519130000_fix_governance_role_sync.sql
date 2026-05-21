-- ============================================================================
-- ADIOS PLATFORM MIGRATION - GOVERNANCE ROLE & RLS SYNCHRONIZATION
-- ============================================================================

-- 1. Redefine can_access_record with direct role checks and JWT support
CREATE OR REPLACE FUNCTION public.can_access_record(
    p_creator_id UUID, 
    p_assignee_id UUID, 
    p_department_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- RULE 1: SUPER_ADMIN sees everything (Fast JWT check, Direct User Master check, or Legacy User Roles check)
    IF (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'SUPER_ADMIN'
        OR EXISTS (
            SELECT 1 FROM public.user_master um
            JOIN public.roles r ON um.role_id = r.id
            WHERE um.id = auth.uid() AND r.code = 'SUPER_ADMIN'
        )
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.code = 'SUPER_ADMIN'
        )
    ) THEN RETURN TRUE; END IF;

    -- RULE 1.5: USERS_MANAGE permission holders see/update all personnel (For HR/Management)
    IF EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        JOIN public.role_permissions rp ON r.id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE um.id = auth.uid() AND p.code = 'USERS_MANAGE'
    ) OR EXISTS (
        SELECT 1 FROM public.user_permissions_snapshot ups
        WHERE ups.user_id = auth.uid() AND ups.permission_code = 'USERS_MANAGE'
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

-- 2. Populate legacy user_roles for role compatibility
-- Note: user_permissions_snapshot is now managed by triggers in the comprehensive migration
INSERT INTO public.user_roles (user_id, role_id)
SELECT id, role_id FROM public.user_master 
WHERE role_id IS NOT NULL
ON CONFLICT (user_id, role_id) DO NOTHING;
