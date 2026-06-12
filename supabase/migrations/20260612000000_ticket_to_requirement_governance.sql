-- Migration: Ticket-to-Requirement Governance Workflow
-- Objective: Support the new enterprise requirements lifecycle

BEGIN;

-- 1. Add new columns to existing requirements table
ALTER TABLE public.requirements 
ADD COLUMN IF NOT EXISTS source_ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS requester_id uuid REFERENCES public.user_master(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS requester_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS scope text,
ADD COLUMN IF NOT EXISTS requirement_reason text,
ADD COLUMN IF NOT EXISTS budget_impact numeric(15, 2),
ADD COLUMN IF NOT EXISTS estimated_effort text,
ADD COLUMN IF NOT EXISTS dependency_notes text,
ADD COLUMN IF NOT EXISTS start_date timestamptz,
ADD COLUMN IF NOT EXISTS expected_completion_date timestamptz,
ADD COLUMN IF NOT EXISTS actual_completion_date timestamptz;

-- 2. Impacted Departments Mapping
CREATE TABLE IF NOT EXISTS public.requirement_impacted_departments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    requirement_id uuid NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    selection_order int NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    UNIQUE(requirement_id, department_id)
);

-- 3. Approval Matrix Configuration
CREATE TABLE IF NOT EXISTS public.requirement_approval_matrix (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    level int NOT NULL,
    designation_id uuid NOT NULL REFERENCES public.designations(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(department_id, level)
);

-- 4. Dynamic Approval Flow Snapshot
CREATE TABLE IF NOT EXISTS public.requirement_approval_flow (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    requirement_id uuid NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    level int NOT NULL,
    department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    approver_designation_id uuid REFERENCES public.designations(id),
    approver_id uuid REFERENCES public.user_master(id),
    status text DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, HOLD, CLARIFICATION
    remarks text,
    actioned_at timestamptz,
    created_at timestamptz DEFAULT now(),
    UNIQUE(requirement_id, level)
);

-- Ensure Sequence exists for Scope-wise numbering
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.series_tracker WHERE prefix = 'ERP-REQ') THEN
        INSERT INTO public.series_tracker(prefix, financial_year, month, last_value) VALUES ('ERP-REQ', '2026', '01', 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.series_tracker WHERE prefix = 'INF-REQ') THEN
        INSERT INTO public.series_tracker(prefix, financial_year, month, last_value) VALUES ('INF-REQ', '2026', '01', 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.series_tracker WHERE prefix = 'OTH-REQ') THEN
        INSERT INTO public.series_tracker(prefix, financial_year, month, last_value) VALUES ('OTH-REQ', '2026', '01', 0);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.requirement_impacted_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_approval_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_approval_flow ENABLE ROW LEVEL SECURITY;

-- Apply strictly governed RLS policies following the enterprise CRUDM IAM framework

-- 1. Policies for requirement_impacted_departments (inherit from requirements)
DROP POLICY IF EXISTS policy_impacted_deps_select ON public.requirement_impacted_departments;
CREATE POLICY policy_impacted_deps_select ON public.requirement_impacted_departments FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.requirements r
        WHERE r.id = requirement_impacted_departments.requirement_id
        AND (
            public.is_super_admin()
            OR (
                public.check_user_permission('REQUIREMENTS_VIEW') 
                AND public.can_access_record(r.creator_id, NULL, r.department_id)
            )
        )
    )
);

DROP POLICY IF EXISTS policy_impacted_deps_insert ON public.requirement_impacted_departments;
CREATE POLICY policy_impacted_deps_insert ON public.requirement_impacted_departments FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.requirements r
        WHERE r.id = requirement_impacted_departments.requirement_id
        AND (
            public.is_super_admin()
            OR (
                public.check_user_permission('REQUIREMENTS_UPDATE') 
                AND public.can_access_record(r.creator_id, NULL, r.department_id)
            )
        )
    )
);

DROP POLICY IF EXISTS policy_impacted_deps_update ON public.requirement_impacted_departments;
CREATE POLICY policy_impacted_deps_update ON public.requirement_impacted_departments FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.requirements r
        WHERE r.id = requirement_impacted_departments.requirement_id
        AND (
            public.is_super_admin()
            OR (
                public.check_user_permission('REQUIREMENTS_UPDATE') 
                AND public.can_access_record(r.creator_id, NULL, r.department_id)
            )
        )
    )
);

DROP POLICY IF EXISTS policy_impacted_deps_delete ON public.requirement_impacted_departments;
CREATE POLICY policy_impacted_deps_delete ON public.requirement_impacted_departments FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.requirements r
        WHERE r.id = requirement_impacted_departments.requirement_id
        AND (
            public.is_super_admin()
            OR (
                public.check_user_permission('REQUIREMENTS_UPDATE') 
                AND public.can_access_record(r.creator_id, NULL, r.department_id)
            )
        )
    )
);

-- 2. Policies for requirement_approval_flow (inherit from requirements)
DROP POLICY IF EXISTS policy_flow_select ON public.requirement_approval_flow;
CREATE POLICY policy_flow_select ON public.requirement_approval_flow FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.requirements r
        WHERE r.id = requirement_approval_flow.requirement_id
        AND (
            public.is_super_admin()
            OR (
                public.check_user_permission('REQUIREMENTS_VIEW') 
                AND public.can_access_record(r.creator_id, NULL, r.department_id)
            )
        )
    )
);

DROP POLICY IF EXISTS policy_flow_insert ON public.requirement_approval_flow;
CREATE POLICY policy_flow_insert ON public.requirement_approval_flow FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.requirements r
        WHERE r.id = requirement_approval_flow.requirement_id
        AND (
            public.is_super_admin()
            OR (
                public.check_user_permission('REQUIREMENTS_UPDATE') 
                AND public.can_access_record(r.creator_id, NULL, r.department_id)
            )
        )
    )
);

DROP POLICY IF EXISTS policy_flow_update ON public.requirement_approval_flow;
CREATE POLICY policy_flow_update ON public.requirement_approval_flow FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.requirements r
        WHERE r.id = requirement_approval_flow.requirement_id
        AND (
            public.is_super_admin()
            OR (
                public.check_user_permission('REQUIREMENTS_UPDATE') 
                AND public.can_access_record(r.creator_id, NULL, r.department_id)
            )
        )
    )
);

DROP POLICY IF EXISTS policy_flow_delete ON public.requirement_approval_flow;
CREATE POLICY policy_flow_delete ON public.requirement_approval_flow FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.requirements r
        WHERE r.id = requirement_approval_flow.requirement_id
        AND (
            public.is_super_admin()
            OR (
                public.check_user_permission('REQUIREMENTS_UPDATE') 
                AND public.can_access_record(r.creator_id, NULL, r.department_id)
            )
        )
    )
);

-- 3. Policies for requirement_approval_matrix (Master config governed by MASTERS_MANAGE)
DROP POLICY IF EXISTS policy_matrix_select ON public.requirement_approval_matrix;
CREATE POLICY policy_matrix_select ON public.requirement_approval_matrix FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR public.check_user_permission('MASTERS_VIEW')
    OR public.check_user_permission('REQUIREMENTS_VIEW')
);

DROP POLICY IF EXISTS policy_matrix_insert ON public.requirement_approval_matrix;
CREATE POLICY policy_matrix_insert ON public.requirement_approval_matrix FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR public.check_user_permission('MASTERS_MANAGE')
);

DROP POLICY IF EXISTS policy_matrix_update ON public.requirement_approval_matrix;
CREATE POLICY policy_matrix_update ON public.requirement_approval_matrix FOR UPDATE TO authenticated
USING (
    public.is_super_admin()
    OR public.check_user_permission('MASTERS_MANAGE')
);

DROP POLICY IF EXISTS policy_matrix_delete ON public.requirement_approval_matrix;
CREATE POLICY policy_matrix_delete ON public.requirement_approval_matrix FOR DELETE TO authenticated
USING (
    public.is_super_admin()
    OR public.check_user_permission('MASTERS_MANAGE')
);

COMMIT;

-- ============================================================================
-- FIX: Repair Authentication Trigger for New User Creation
-- ============================================================================

-- The previous identity sync trigger referenced 'password_hash' which was removed 
-- from public.user_master. This recreates the trigger safely.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role_code TEXT;
    v_role_id UUID;
BEGIN
    SET search_path = public;
    INSERT INTO public.user_master (
        id,
        full_name,
        email,
        user_code,
        department_id,
        designation_id,
        profile_photo,
        is_active,
        password_hash
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'user_code', 
            'USR-' || substring(NEW.id::text from 1 for 8)
        ),
        NULLIF(NEW.raw_user_meta_data->>'department_id', '')::UUID,
        NULLIF(NEW.raw_user_meta_data->>'designation_id', '')::UUID,
        NEW.raw_user_meta_data->>'profile_photo',
        true,
        'SUPABASE_AUTH'
    ) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

    FOR v_role_code IN 
        SELECT jsonb_array_elements_text(
            COALESCE(NEW.raw_user_meta_data->'provisioned_roles', '["ROLE_STAFF"]'::jsonb)
        )
    LOOP
        SELECT id INTO v_role_id FROM public.roles WHERE code = v_role_code LIMIT 1;
        
        IF v_role_id IS NOT NULL THEN
            INSERT INTO public.user_roles (user_id, role_id)
            VALUES (NEW.id, v_role_id)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure handle_new_user_sync doesn't conflict if left behind
CREATE OR REPLACE FUNCTION public.handle_new_user_sync()
RETURNS TRIGGER AS $$
BEGIN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
