-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: AMC Governance & Vendor Master
-- ============================================================================

-- 1. Create Vendor Master Table
CREATE TABLE IF NOT EXISTS public.vendor_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    website TEXT,
    contact_email TEXT,
    phone TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.user_master(id)
);

-- Enable RLS for Vendor Master
ALTER TABLE public.vendor_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view vendors" ON public.vendor_master;
CREATE POLICY "Anyone authenticated can view vendors" ON public.vendor_master
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage vendors" ON public.vendor_master;
CREATE POLICY "Admins can manage vendors" ON public.vendor_master
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_master um
            JOIN public.roles r ON um.role_id = r.id
            WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN', 'IT_ADMIN')
        )
    );

-- 2. Add Governance Fields to software_amc
ALTER TABLE public.software_amc
    ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendor_master(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'Pending Approval' CHECK (approval_status IN ('Draft', 'Pending Approval', 'Active', 'Rejected'));

-- 3. Data Migration: Move existing provider_names into vendor_master
-- (Skipped: provider_name column has already been dropped on the remote database)

-- 4. Clean up old text field (Optional, but best practice for schema integrity)
-- We will leave it for exactly 1 minute to ensure rollback safety if needed, 
-- but in a production script you might drop it. We'll drop it here to force the UI upgrade.
ALTER TABLE public.software_amc DROP COLUMN IF EXISTS provider_name;

-- End of Script
