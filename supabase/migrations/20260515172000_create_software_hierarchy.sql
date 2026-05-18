-- ============================================================================
-- Enterprise Software Architecture Migration
-- Feature: Multi-tier Software Governance (Systems > Modules > Submodules)
-- ============================================================================

-- 1. Create software_modules table
CREATE TABLE IF NOT EXISTS software_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_id UUID REFERENCES software_systems(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    scope_id INTEGER DEFAULT 2, -- Default to ERP
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create software_submodules table
CREATE TABLE IF NOT EXISTS software_submodules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES software_modules(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    scope_id INTEGER DEFAULT 2, -- Default to ERP
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Seed initial ERP modules for demonstration
DO $$
DECLARE
    sys_id UUID;
BEGIN
    SELECT id INTO sys_id FROM software_systems WHERE code = 'SYS_SAP' LIMIT 1;
    
    IF sys_id IS NOT NULL THEN
        INSERT INTO software_modules (system_id, code, name, description, scope_id)
        VALUES 
            (sys_id, 'MOD_FI', 'Financial Accounting', 'Core financial and accounting modules.', 2),
            (sys_id, 'MOD_MM', 'Materials Management', 'Procurement and inventory management.', 2)
        ON CONFLICT (code) DO NOTHING;
    END IF;
END $$;
