-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: AMC Enterprise Fields & License Tracking
-- ============================================================================

ALTER TABLE public.software_amc
    ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR',
    ADD COLUMN IF NOT EXISTS total_licenses INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS used_licenses INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cost_per_license NUMERIC(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS license_key TEXT,
    ADD COLUMN IF NOT EXISTS payment_terms TEXT,
    ADD COLUMN IF NOT EXISTS support_tier TEXT,
    ADD COLUMN IF NOT EXISTS sla_uptime NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS sla_tat TEXT,
    ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS notify_before_days INTEGER DEFAULT 30;

-- Audit Logging Table for License Key Views
CREATE TABLE IF NOT EXISTS public.amc_license_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amc_id UUID NOT NULL REFERENCES public.software_amc(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_master(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.amc_license_views ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert logs and view their own logs (or admins to view all)
CREATE POLICY "Authenticated users can insert license view logs" ON public.amc_license_views
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can view license view logs for AMCs they own" ON public.amc_license_views
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.software_amc sa 
            WHERE sa.id = amc_license_views.amc_id 
            AND sa.assigned_to = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.user_master um
            JOIN public.roles r ON um.role_id = r.id
            WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN', 'IT_ADMIN')
        )
    );

-- End of Script
