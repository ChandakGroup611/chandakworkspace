-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: AMC / Subscription Enterprise Amortization, Risk & Vendor Evaluation
-- ============================================================================

-- 1. Add enterprise evaluation & amortization columns to software_amc
ALTER TABLE public.software_amc 
ADD COLUMN IF NOT EXISTS vendor_rating NUMERIC(2,1) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS vendor_evaluation_notes TEXT,
ADD COLUMN IF NOT EXISTS monthly_amortized_cost NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS sla_adherence_percent NUMERIC(5,2) DEFAULT 100.0,
ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'Low',
ADD COLUMN IF NOT EXISTS renewal_alert_days INT[] DEFAULT ARRAY[30, 60, 90],
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- 2. Create amc_vendor_evaluations table
CREATE TABLE IF NOT EXISTS public.amc_vendor_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amc_id UUID NOT NULL REFERENCES public.software_amc(id) ON DELETE CASCADE,
    rating NUMERIC(2,1) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
    review_title TEXT,
    review_notes TEXT,
    sla_score NUMERIC(5,2) DEFAULT 100.0,
    evaluated_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    evaluation_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_software_amc_expiry_risk ON public.software_amc(expiry_date, risk_level, status);
CREATE INDEX IF NOT EXISTS idx_software_amc_vendor_rating ON public.software_amc(vendor_id, vendor_rating);
CREATE INDEX IF NOT EXISTS idx_amc_vendor_evaluations_amc ON public.amc_vendor_evaluations(amc_id);
CREATE INDEX IF NOT EXISTS idx_amc_vendor_evaluations_date ON public.amc_vendor_evaluations(evaluation_date DESC);

-- 4. Enable Row Level Security (RLS) on amc_vendor_evaluations
ALTER TABLE public.amc_vendor_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view vendor evaluations" ON public.amc_vendor_evaluations;
CREATE POLICY "Users can view vendor evaluations" ON public.amc_vendor_evaluations
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can mutate vendor evaluations" ON public.amc_vendor_evaluations;
CREATE POLICY "Users can mutate vendor evaluations" ON public.amc_vendor_evaluations
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
