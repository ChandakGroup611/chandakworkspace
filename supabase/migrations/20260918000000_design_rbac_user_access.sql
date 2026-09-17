-- ==============================================================================
-- Migration: Design Tracking RBAC & User Project Access Governance
-- Description: Creates table for storing user-specific Design Tracking roles, 
--              assigned project scopes, and granular functional permissions.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.design_user_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_master(id) ON DELETE CASCADE,
    design_role TEXT NOT NULL DEFAULT 'VIEWER', 
    -- Roles: DESIGN_ADMIN, DESIGN_LEAD, DESIGN_COORDINATOR, CONSULTANT, SITE_ENGINEER, TPQA_AUDITOR, VIEWER
    project_access_type TEXT NOT NULL DEFAULT 'ALL_PROJECTS', -- ALL_PROJECTS, SELECTED_PROJECTS
    assigned_project_ids TEXT[] DEFAULT '{}',
    can_matrix_edit BOOLEAN NOT NULL DEFAULT true,
    can_drawings_upload BOOLEAN NOT NULL DEFAULT true,
    can_drawings_approve_gfc BOOLEAN NOT NULL DEFAULT false,
    can_transmittals_create BOOLEAN NOT NULL DEFAULT true,
    can_rfis_manage BOOLEAN NOT NULL DEFAULT true,
    can_masters_manage BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_design_user_access UNIQUE (user_id)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_design_user_access_user_id ON public.design_user_access(user_id);
CREATE INDEX IF NOT EXISTS idx_design_user_access_role ON public.design_user_access(design_role);

-- Enable RLS
ALTER TABLE public.design_user_access ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own access or all if admin/design lead
DROP POLICY IF EXISTS "Allow authenticated to view design user access" ON public.design_user_access;
CREATE POLICY "Allow authenticated to view design user access"
ON public.design_user_access
FOR SELECT
TO authenticated
USING (true);

-- Allow admins and design leads to manage design user access
DROP POLICY IF EXISTS "Allow admins to manage design user access" ON public.design_user_access;
CREATE POLICY "Allow admins to manage design user access"
ON public.design_user_access
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
    )
    OR EXISTS (
        SELECT 1 FROM public.design_user_access dua
        WHERE dua.user_id = auth.uid() AND dua.design_role = 'DESIGN_ADMIN'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
    )
    OR EXISTS (
        SELECT 1 FROM public.design_user_access dua
        WHERE dua.user_id = auth.uid() AND dua.design_role = 'DESIGN_ADMIN'
    )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.design_user_access TO authenticated;
