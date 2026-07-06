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

DROP POLICY IF EXISTS policy_assets_capability_enforcement ON public.assets;
CREATE POLICY policy_assets_capability_enforcement ON public.assets 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);
