-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Software AMC and Subscription Management
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.software_amc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    software_name TEXT NOT NULL,
    provider_name TEXT,
    contract_type TEXT NOT NULL CHECK (contract_type IN ('AMC', 'Subscription', 'Perpetual License', 'Other')),
    purchase_date DATE,
    expiry_date DATE,
    cost NUMERIC,
    assigned_to UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER update_software_amc_modtime
    BEFORE UPDATE ON public.software_amc
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE INDEX IF NOT EXISTS idx_software_amc_assigned_to ON public.software_amc(assigned_to) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_software_amc_dept ON public.software_amc(department_id) WHERE NOT is_deleted;

-- Enable RLS
ALTER TABLE public.software_amc ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy Injector Macro Rules
-- Allow select for all authenticated users (or restrict based on roles if needed later)
DROP POLICY IF EXISTS policy_software_amc_select ON public.software_amc;
CREATE POLICY policy_software_amc_select ON public.software_amc 
    FOR SELECT 
    USING (NOT is_deleted);

-- Allow mutate for authenticated users (further restrictions can be enforced at UI/API layer or via roles)
DROP POLICY IF EXISTS policy_software_amc_mutate ON public.software_amc;
CREATE POLICY policy_software_amc_mutate ON public.software_amc 
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- Seed Granular Permissions for AMC
INSERT INTO public.permissions (code, name, module, submodule, action, resource_type) VALUES
('AMC_VIEW', 'View AMC', 'Governance & Analysis', 'AMC', 'READ', 'PAGE'),
('AMC_CREATE', 'Create AMC', 'Governance & Analysis', 'AMC', 'WRITE', 'ACTION'),
('AMC_EDIT', 'Edit AMC', 'Governance & Analysis', 'AMC', 'WRITE', 'ACTION'),
('AMC_DELETE', 'Delete AMC', 'Governance & Analysis', 'AMC', 'DELETE', 'ACTION')
ON CONFLICT (code) DO NOTHING;

-- Map basic AMC permissions to SUPER_ADMIN and ROLE_ADMIN
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p 
WHERE r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN') 
AND p.code IN ('AMC_VIEW', 'AMC_CREATE', 'AMC_EDIT', 'AMC_DELETE')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- End of Script
