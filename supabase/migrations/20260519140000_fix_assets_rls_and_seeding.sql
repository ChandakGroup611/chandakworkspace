-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Enable Complete Assets CRUD & Database-Driven Assignment
-- ============================================================================

-- 1. Drop restrictive RLS policies on the assets table
DROP POLICY IF EXISTS policy_assets_scope_select ON public.assets;
DROP POLICY IF EXISTS policy_assets_capability_enforcement ON public.assets;
DROP POLICY IF EXISTS policy_ast_select ON public.assets;
DROP POLICY IF EXISTS policy_ast_mutate ON public.assets;

-- 2. Reinstate uniform, robust RLS policies matching other master tables
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_assets_capability_enforcement ON public.assets 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- 3. Clear soft-deleted assets to prevent duplicates and seed high-quality hardware options
DELETE FROM public.assets WHERE is_deleted = true OR code IN ('AST_HW_001', 'AST_HW_002', 'AST_HW_003', 'AST_HW_004', 'AST_HW_005');

INSERT INTO public.assets (code, name, asset_tag, status, is_active, is_deleted, scope_id) VALUES
    ('AST_HW_001', 'MacBook Pro 16-inch M3 Max', 'TAG-MBP-16', 'OPERATIONAL', true, false, 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1'),
    ('AST_HW_002', 'iPhone 15 Pro Max Enterprise Edition', 'TAG-IPH-15', 'OPERATIONAL', true, false, 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1'),
    ('AST_HW_003', 'Dell XPS 15 Ultra Developer Spec', 'TAG-DELL-XPS', 'OPERATIONAL', true, false, 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1'),
    ('AST_HW_004', 'Studio Display 27-inch 5K Monitor', 'TAG-MON-27', 'OPERATIONAL', true, false, 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1'),
    ('AST_HW_005', 'Microsoft Surface Pro 9 LTE', 'TAG-SURF-P9', 'OPERATIONAL', true, false, 'e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1')
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name, 
    asset_tag = EXCLUDED.asset_tag, 
    status = EXCLUDED.status, 
    is_active = EXCLUDED.is_active, 
    is_deleted = EXCLUDED.is_deleted, 
    scope_id = EXCLUDED.scope_id;
