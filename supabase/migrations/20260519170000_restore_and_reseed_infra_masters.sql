-- ============================================================================
-- ADIOS PLATFORM MIGRATION - IT INFRASTRUCTURE MASTERS RESTORATION & RESEED
-- ============================================================================

-- 1. RESTORE CORE INFRASTRUCTURE ISSUE TYPES TO ACTIVE STATE
-- ----------------------------------------------------------------------------
UPDATE public.issue_types 
SET 
    is_active = true, 
    is_deleted = false,
    scope_id = 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1'
WHERE code IN ('HARDWARE', 'LAPTOP NOT WORKING', 'OS', 'INSTALLATION');

-- 2. RESTORE CORE INFRASTRUCTURE TICKET CATEGORIES TO ACTIVE STATE
-- ----------------------------------------------------------------------------
UPDATE public.ticket_categories 
SET 
    is_active = true, 
    is_deleted = false,
    scope_id = 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1'
WHERE code IN ('HARDWARE', 'CAT_HARDWARE', 'INSTALLATION', 'TEST');

-- 3. REACTIVATE & SCOPE DEPENDENT SUBTYPES
-- ----------------------------------------------------------------------------
UPDATE public.issue_subtypes
SET 
    is_active = true, 
    is_deleted = false,
    scope_id = 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1'
WHERE issue_type_id IN (
    SELECT id FROM public.issue_types 
    WHERE scope_id = 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1'
);

-- Ensure there is a subtype for INSTALLATION so it isn't empty
INSERT INTO public.issue_subtypes (code, name, issue_type_id, scope_id, is_active, is_deleted)
SELECT 'SUBTYPE_INSTALL_SOFT', 'Software Installation Request', id, 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1', true, false
FROM public.issue_types WHERE code = 'INSTALLATION'
ON CONFLICT (code) DO UPDATE SET is_active = true, is_deleted = false;

-- 4. REACTIVATE & SCOPE DEPENDENT SUBCATEGORIES
-- ----------------------------------------------------------------------------
UPDATE public.ticket_subcategories
SET 
    is_active = true, 
    is_deleted = false,
    scope_id = 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1'
WHERE category_id IN (
    SELECT id FROM public.ticket_categories 
    WHERE scope_id = 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1'
);

-- 5. SEED ACTIVE DEMONSTRATION ASSETS FOR IT INFRASTRUCTURE
-- ----------------------------------------------------------------------------
INSERT INTO public.assets (code, name, asset_tag, status, scope_id, is_active, is_deleted) VALUES
    ('AST_LAPTOP_001', 'MacBook Pro 16" - M3 Max (Executive)', 'TAG-LAPTOP-001', 'OPERATIONAL', 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1', true, false),
    ('AST_MONITOR_002', 'Dell UltraSharp 34" Curved Monitor', 'TAG-MON-002', 'OPERATIONAL', 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1', true, false),
    ('AST_PHONE_003', 'iPhone 15 Pro Max - Corporate iOS', 'TAG-PHONE-003', 'OPERATIONAL', 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1', true, false)
ON CONFLICT (code) DO UPDATE SET 
    is_active = true, 
    is_deleted = false, 
    scope_id = EXCLUDED.scope_id, 
    status = EXCLUDED.status;
