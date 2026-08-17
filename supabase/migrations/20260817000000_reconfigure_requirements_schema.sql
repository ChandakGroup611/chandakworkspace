-- ============================================================================
-- Migration: Reconfigure Requirement Module
-- Purpose: Add standard enterprise fields (story points, acceptance criteria, tags)
--          and ensure `current_assignee_id` exists for API compatibility.
-- ============================================================================

BEGIN;

-- 1. Add current_assignee_id if missing, or rename assigned_analyst_id if needed
-- We'll safely add current_assignee_id to match the frontend expectations.
ALTER TABLE public.requirements
ADD COLUMN IF NOT EXISTS current_assignee_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL;

-- If assigned_analyst_id exists and has data, we might migrate it, but to be safe and non-destructive:
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'requirements' AND column_name = 'assigned_analyst_id'
    ) THEN
        UPDATE public.requirements 
        SET current_assignee_id = assigned_analyst_id 
        WHERE current_assignee_id IS NULL AND assigned_analyst_id IS NOT NULL;
    END IF;
END $$;

-- 2. Add standard enterprise fields
ALTER TABLE public.requirements
ADD COLUMN IF NOT EXISTS parent_requirement_id UUID REFERENCES public.requirements(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT,
ADD COLUMN IF NOT EXISTS story_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_release TEXT,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- 3. (Optional) We keep `functional_scope` and `technical_scope` around for historical data
-- but we rely on `scope` and `requirement_details` going forward.

COMMIT;
