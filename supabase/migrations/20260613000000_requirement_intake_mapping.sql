-- ============================================================================
-- Migration: Requirement Intake Mapping & Governance
-- Purpose: Add explicit columns for requirement intake mapping and create transactional RPC.
-- ============================================================================

BEGIN;

-- 1. Add missing explicit columns to public.requirements
ALTER TABLE public.requirements 
ADD COLUMN IF NOT EXISTS software_system_id UUID REFERENCES public.software_systems(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.software_modules(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sub_module_id UUID REFERENCES public.software_submodules(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.ticket_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sub_category_id UUID REFERENCES public.ticket_subcategories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS requirement_details TEXT,
ADD COLUMN IF NOT EXISTS requester_designation_id UUID REFERENCES public.designations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS intake_snapshot JSONB;

-- 2. Create the transactional RPC function for atomic requirement creation
CREATE OR REPLACE FUNCTION public.create_requirement_transaction(
    p_workspace_id text,
    p_sub_workspace_id text,
    p_requirement_code text,
    p_title text,
    p_objective text,
    p_functional_scope text,
    p_technical_scope text,
    p_business_value text,
    p_risk_assessment text,
    p_custom_fields jsonb,
    p_created_by uuid,
    p_status_id uuid,
    p_department_id uuid,
    p_scope text,
    p_software_system_id uuid,
    p_module_id uuid,
    p_sub_module_id uuid,
    p_category_id uuid,
    p_sub_category_id uuid,
    p_priority_id uuid,
    p_requirement_reason text,
    p_requirement_details text,
    p_requester_id uuid,
    p_requester_department_id uuid,
    p_requester_designation_id uuid,
    p_intake_snapshot jsonb
) RETURNS jsonb AS $$
DECLARE
    v_req_id uuid;
    v_status_id uuid;
    v_department_id uuid;
    v_code text;
    v_result jsonb;
BEGIN
    -- Validation Check: mandatory mappings
    IF p_title IS NULL OR p_title = '' THEN
        RAISE EXCEPTION 'Title/Subject is mandatory';
    END IF;
    
    -- Assign defaults
    v_status_id := p_status_id;
    v_department_id := p_department_id;
    v_code := COALESCE(p_requirement_code, 'REQ-' || floor(random() * 1000000)::text);

    -- Insert the requirement
    INSERT INTO public.requirements (
        code,
        title,
        objective,
        functional_scope,
        technical_scope,
        custom_fields,
        creator_id,
        status_id,
        department_id,
        scope,
        software_system_id,
        module_id,
        sub_module_id,
        category_id,
        sub_category_id,
        priority_id,
        requirement_reason,
        requirement_details,
        requester_id,
        requester_department_id,
        requester_designation_id,
        intake_snapshot
    ) VALUES (
        v_code,
        p_title,
        p_objective,
        p_functional_scope,
        p_technical_scope,
        p_custom_fields,
        p_created_by,
        v_status_id,
        v_department_id,
        p_scope,
        p_software_system_id,
        p_module_id,
        p_sub_module_id,
        p_category_id,
        p_sub_category_id,
        p_priority_id,
        p_requirement_reason,
        p_requirement_details,
        p_requester_id,
        p_requester_department_id,
        p_requester_designation_id,
        p_intake_snapshot
    ) RETURNING id INTO v_req_id;

    -- Return the created ID and Code
    v_result := jsonb_build_object('id', v_req_id, 'code', v_code);
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
