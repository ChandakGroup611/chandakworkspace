-- =========================================================================
-- PHASE 1: RLS SIMPLIFICATION SCRIPT
-- Objective: Strip out all complex business-logic RLS policies.
-- Enforce minimal authentication only: auth.uid() IS NOT NULL.
-- Filtering and visibility will now be handled exclusively by the Backend Repository Layer.
-- =========================================================================

DO $$ 
DECLARE
    t_record RECORD;
    p_record RECORD;
BEGIN
    -- Loop through all tables in the public schema
    FOR t_record IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        -- Enable RLS just to be safe
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_record.tablename);

        -- Loop through all existing policies on this table and drop them
        FOR p_record IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t_record.tablename)
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', p_record.policyname, t_record.tablename);
        END LOOP;

        -- Create the new Minimal Authentication Policy
        -- This allows any authenticated user to perform CRUD operations at the database level.
        -- True security and visibility filtering is now delegated to the Application's Backend Repository layer!
        EXECUTE format('
            CREATE POLICY minimal_auth_policy ON public.%I 
            FOR ALL TO authenticated 
            USING (auth.uid() IS NOT NULL) 
            WITH CHECK (auth.uid() IS NOT NULL);
        ', t_record.tablename);
    END LOOP;
END $$;
