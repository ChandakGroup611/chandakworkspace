-- ==============================================================================
-- Migration: Fleet & Vehicle Management RBAC & User Access Governance
-- Description: Creates table for storing user-specific Fleet roles, 
--              assigned vehicle scopes, and granular functional permissions.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.fleet_user_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_master(id) ON DELETE CASCADE,
    fleet_role TEXT NOT NULL DEFAULT 'TRAVELER', 
    -- Roles: FLEET_ADMIN, FLEET_DISPATCHER, FLEET_WORKSHOP, DRIVER, TRAVELER, FLEET_VIEWER
    scope_type TEXT NOT NULL DEFAULT 'ALL_VEHICLES', -- ALL_VEHICLES, ASSIGNED_ONLY, BRANCH_SCOPED
    assigned_vehicle_ids TEXT[] DEFAULT '{}',
    can_manage_vehicles BOOLEAN NOT NULL DEFAULT false,
    can_manage_drivers BOOLEAN NOT NULL DEFAULT false,
    can_dispatch_trips BOOLEAN NOT NULL DEFAULT false,
    can_manage_maintenance BOOLEAN NOT NULL DEFAULT false,
    can_view_reports BOOLEAN NOT NULL DEFAULT false,
    can_manage_settings BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_fleet_user_access UNIQUE (user_id)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_fleet_user_access_user_id ON public.fleet_user_access(user_id);
CREATE INDEX IF NOT EXISTS idx_fleet_user_access_role ON public.fleet_user_access(fleet_role);

-- Enable RLS
ALTER TABLE public.fleet_user_access ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view fleet access
DROP POLICY IF EXISTS "Allow authenticated to view fleet user access" ON public.fleet_user_access;
CREATE POLICY "Allow authenticated to view fleet user access"
ON public.fleet_user_access
FOR SELECT
TO authenticated
USING (true);

-- Allow admins and fleet administrators to manage fleet user access
DROP POLICY IF EXISTS "Allow admins to manage fleet user access" ON public.fleet_user_access;
CREATE POLICY "Allow admins to manage fleet user access"
ON public.fleet_user_access
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
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
        WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
    )
    OR EXISTS (
        SELECT 1 FROM public.fleet_user_access fua
        WHERE fua.user_id = auth.uid() AND fua.fleet_role = 'FLEET_ADMIN'
    )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleet_user_access TO authenticated;
