-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: AMC / Subscription Implementation & Onboarding Lifecycle
-- ============================================================================

-- 1. Add implementation_status column to software_amc
ALTER TABLE public.software_amc 
ADD COLUMN IF NOT EXISTS implementation_status TEXT DEFAULT 'Purchased';

-- 2. Create amc_implementation_stages table
CREATE TABLE IF NOT EXISTS public.amc_implementation_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amc_id UUID NOT NULL REFERENCES public.software_amc(id) ON DELETE CASCADE,
    stage_key TEXT NOT NULL,
    stage_name TEXT NOT NULL,
    sequence_order INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Blocked', 'Skipped')),
    target_date DATE,
    completed_date DATE,
    assigned_to UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    signoff_person_name TEXT,
    notes TEXT,
    attachment_file_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_amc_impl_stages_amc_id ON public.amc_implementation_stages(amc_id);
CREATE INDEX IF NOT EXISTS idx_amc_impl_stages_status ON public.amc_implementation_stages(status);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.amc_implementation_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view implementation stages" ON public.amc_implementation_stages;
CREATE POLICY "Users can view implementation stages" ON public.amc_implementation_stages
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can mutate implementation stages" ON public.amc_implementation_stages;
CREATE POLICY "Users can mutate implementation stages" ON public.amc_implementation_stages
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
