-- ============================================================================
-- Migration: 20261122130000_module_rbac_sync_foundation.sql
-- Description: Phase 0 - Foundation Schema for Dynamic RBAC Policy Synchronization & Override Tracking
-- Governance: Master Architecture Blueprint v2.0
-- ============================================================================

-- 1. Extend module_roles with policy versioning and customization tracking
ALTER TABLE public.module_roles 
    ADD COLUMN IF NOT EXISTS policy_version integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS is_customized boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.user_master(id);

-- 2. Create module_role_overrides table to distinguish admin decisions from manifest defaults
CREATE TABLE IF NOT EXISTS public.module_role_overrides (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    module_code text NOT NULL,
    role_code text NOT NULL,
    permission_code text NOT NULL,
    is_granted boolean NOT NULL,
    overridden_by uuid NOT NULL REFERENCES public.user_master(id),
    overridden_at timestamptz NOT NULL DEFAULT now(),
    notes text,
    CONSTRAINT uq_module_role_perm_override UNIQUE (module_code, role_code, permission_code),
    CONSTRAINT fk_override_role FOREIGN KEY (module_code, role_code) 
        REFERENCES public.module_roles(module_code, role_code) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_module_role_overrides_lookup 
    ON public.module_role_overrides (module_code, role_code);

-- 3. Create rbac_sync_audit_logs table to record synchronization history
CREATE TABLE IF NOT EXISTS public.rbac_sync_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    module_code text NOT NULL,
    previous_version integer,
    new_version integer NOT NULL,
    added_permissions text[] DEFAULT '{}',
    modified_roles text[] DEFAULT '{}',
    sync_status text NOT NULL, -- 'SUCCESS' | 'WARNING' | 'FAILED'
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    executed_by text NOT NULL, -- 'SYSTEM_DEPLOY' | user UUID
    executed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rbac_sync_audit_logs_mod_time 
    ON public.rbac_sync_audit_logs (module_code, executed_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE public.module_role_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_sync_audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: module_role_overrides
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'module_role_overrides' AND policyname = 'Allow authenticated read module_role_overrides') THEN
        CREATE POLICY "Allow authenticated read module_role_overrides" 
        ON public.module_role_overrides FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'module_role_overrides' AND policyname = 'Allow admins to manage module_role_overrides') THEN
        CREATE POLICY "Allow admins to manage module_role_overrides" 
        ON public.module_role_overrides FOR ALL TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.user_master um 
                JOIN public.roles r ON r.id = um.role_id 
                WHERE um.id = auth.uid() 
                AND r.code IN ('SUPER_ADMIN', 'USER_ADMIN', 'ROLE_ADMIN')
            )
        );
    END IF;
END $$;

-- 6. RLS Policies: rbac_sync_audit_logs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rbac_sync_audit_logs' AND policyname = 'Allow admins to view rbac_sync_audit_logs') THEN
        CREATE POLICY "Allow admins to view rbac_sync_audit_logs" 
        ON public.rbac_sync_audit_logs FOR SELECT TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.user_master um 
                JOIN public.roles r ON r.id = um.role_id 
                WHERE um.id = auth.uid() 
                AND r.code IN ('SUPER_ADMIN', 'USER_ADMIN', 'ROLE_ADMIN')
            )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rbac_sync_audit_logs' AND policyname = 'Allow service role to insert rbac_sync_audit_logs') THEN
        CREATE POLICY "Allow service role to insert rbac_sync_audit_logs" 
        ON public.rbac_sync_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
END $$;
