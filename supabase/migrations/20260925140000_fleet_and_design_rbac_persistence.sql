-- ==============================================================================
-- Migration: Enterprise Fleet and Design RBAC Policies Persistence
-- Description: Creates relational tables for storing role-based policies, 
--              module-level permissions, and movement/ticket scopes for both 
--              Vehicle Desk and Design Tracking modules.
-- ==============================================================================

-- 1. FLEET RBAC POLICIES TABLE
CREATE TABLE IF NOT EXISTS public.fleet_rbac_policies (
    id TEXT PRIMARY KEY,
    role_code TEXT NOT NULL,
    module TEXT NOT NULL,
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_read BOOLEAN NOT NULL DEFAULT true,
    can_update BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    can_approve BOOLEAN NOT NULL DEFAULT false,
    can_export BOOLEAN NOT NULL DEFAULT false,
    movement_access_scope TEXT NOT NULL DEFAULT 'ALL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_fleet_rbac_policies UNIQUE (role_code, module)
);

CREATE INDEX IF NOT EXISTS idx_fleet_rbac_policies_role ON public.fleet_rbac_policies(role_code);
CREATE INDEX IF NOT EXISTS idx_fleet_rbac_policies_module ON public.fleet_rbac_policies(module);

ALTER TABLE public.fleet_rbac_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated to read fleet rbac policies" ON public.fleet_rbac_policies;
CREATE POLICY "Allow authenticated to read fleet rbac policies"
ON public.fleet_rbac_policies
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow admin to manage fleet rbac policies" ON public.fleet_rbac_policies;
CREATE POLICY "Allow admin to manage fleet rbac policies"
ON public.fleet_rbac_policies
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN', 'ADMIN_ROLE', 'ADMIN')
    )
    OR EXISTS (
        SELECT 1 FROM public.fleet_user_access fua
        WHERE fua.user_id = auth.uid() AND fua.fleet_role = 'FLEET_ADMIN'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN', 'ADMIN_ROLE', 'ADMIN')
    )
    OR EXISTS (
        SELECT 1 FROM public.fleet_user_access fua
        WHERE fua.user_id = auth.uid() AND fua.fleet_role = 'FLEET_ADMIN'
    )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleet_rbac_policies TO authenticated;

-- 2. DESIGN USER ACCESS TABLE (Created first so design_rbac_policies can reference it)
CREATE TABLE IF NOT EXISTS public.design_user_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_master(id) ON DELETE CASCADE,
    design_role TEXT NOT NULL DEFAULT 'VIEWER',
    project_access_type TEXT NOT NULL DEFAULT 'ALL',
    assigned_project_ids TEXT[] DEFAULT '{}',
    can_matrix_edit BOOLEAN NOT NULL DEFAULT true,
    can_drawings_upload BOOLEAN NOT NULL DEFAULT true,
    can_drawings_approve_gfc BOOLEAN NOT NULL DEFAULT false,
    can_transmittals_create BOOLEAN NOT NULL DEFAULT true,
    can_rfis_manage BOOLEAN NOT NULL DEFAULT true,
    can_masters_manage BOOLEAN NOT NULL DEFAULT false,
    ticket_access_scope TEXT NOT NULL DEFAULT 'ALL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by TEXT,
    CONSTRAINT uq_design_user_access UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_design_user_access_user_id ON public.design_user_access(user_id);
CREATE INDEX IF NOT EXISTS idx_design_user_access_role ON public.design_user_access(design_role);

ALTER TABLE public.design_user_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated to view design user access" ON public.design_user_access;
CREATE POLICY "Allow authenticated to view design user access"
ON public.design_user_access
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow admins to manage design user access" ON public.design_user_access;
CREATE POLICY "Allow admins to manage design user access"
ON public.design_user_access
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN', 'ADMIN_ROLE', 'ADMIN')
    )
    OR EXISTS (
        SELECT 1 FROM public.design_user_access dua
        WHERE dua.user_id = auth.uid() AND dua.design_role IN ('DESIGN_ADMIN', 'DESIGN_LEAD')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN', 'ADMIN_ROLE', 'ADMIN')
    )
    OR EXISTS (
        SELECT 1 FROM public.design_user_access dua
        WHERE dua.user_id = auth.uid() AND dua.design_role IN ('DESIGN_ADMIN', 'DESIGN_LEAD')
    )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.design_user_access TO authenticated;

-- 3. DESIGN RBAC POLICIES TABLE
CREATE TABLE IF NOT EXISTS public.design_rbac_policies (
    id TEXT PRIMARY KEY,
    role_code TEXT NOT NULL,
    role_name TEXT,
    project_id TEXT NOT NULL DEFAULT 'ALL',
    project_name TEXT,
    module TEXT NOT NULL,
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_read BOOLEAN NOT NULL DEFAULT true,
    can_update BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    can_approve BOOLEAN NOT NULL DEFAULT false,
    can_export BOOLEAN NOT NULL DEFAULT false,
    ticket_access_scope TEXT NOT NULL DEFAULT 'ALL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_design_rbac_policies UNIQUE (role_code, project_id, module)
);

CREATE INDEX IF NOT EXISTS idx_design_rbac_policies_role ON public.design_rbac_policies(role_code);
CREATE INDEX IF NOT EXISTS idx_design_rbac_policies_project ON public.design_rbac_policies(project_id);
CREATE INDEX IF NOT EXISTS idx_design_rbac_policies_module ON public.design_rbac_policies(module);

ALTER TABLE public.design_rbac_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated to read design rbac policies" ON public.design_rbac_policies;
CREATE POLICY "Allow authenticated to read design rbac policies"
ON public.design_rbac_policies
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow admin to manage design rbac policies" ON public.design_rbac_policies;
CREATE POLICY "Allow admin to manage design rbac policies"
ON public.design_rbac_policies
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN', 'ADMIN_ROLE', 'ADMIN')
    )
    OR EXISTS (
        SELECT 1 FROM public.design_user_access dua
        WHERE dua.user_id = auth.uid() AND dua.design_role IN ('DESIGN_ADMIN', 'DESIGN_LEAD')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN', 'ADMIN_ROLE', 'ADMIN')
    )
    OR EXISTS (
        SELECT 1 FROM public.design_user_access dua
        WHERE dua.user_id = auth.uid() AND dua.design_role IN ('DESIGN_ADMIN', 'DESIGN_LEAD')
    )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.design_rbac_policies TO authenticated;
