-- ============================================================================
-- ADIOS PLATFORM: FINAL RLS CLEANUP & TEST SEEDING (Replay-safe)
-- ============================================================================

-- 1. ERADICATE ALL POTENTIALLY RECURSIVE LEGACY POLICIES ON USER_MASTER
DO $$
BEGIN
  IF to_regclass('public.user_master') IS NOT NULL THEN
    DROP POLICY IF EXISTS "policy_user_master_ultimate" ON public.user_master;
    DROP POLICY IF EXISTS "policy_user_master_select_v2" ON public.user_master;
    DROP POLICY IF EXISTS "policy_user_master_update" ON public.user_master;
    DROP POLICY IF EXISTS "policy_user_master_select" ON public.user_master;
    DROP POLICY IF EXISTS "policy_user_master_mutate" ON public.user_master;
    DROP POLICY IF EXISTS "policy_user_master_governance" ON public.user_master;
    DROP POLICY IF EXISTS "policy_unified_personnel" ON public.user_master;

    -- 2. REINSTATE ONLY THE STABLE, NON-RECURSIVE UNIFIED POLICY IF FUNCTION EXISTS
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'can_access_record'
    ) THEN
      CREATE POLICY "policy_unified_personnel" ON public.user_master FOR ALL TO authenticated USING (
        public.can_access_record(id, manager_id, department_id)
      );
    END IF;
  END IF;
END $$;

-- 3. FIX TASK CREATION FOREIGN KEY FAILURES (Assign Test Users to a Department)
DO $$
BEGIN
  IF to_regclass('public.user_master') IS NOT NULL AND to_regclass('public.departments') IS NOT NULL THEN
    UPDATE public.user_master
    SET department_id = (SELECT id FROM public.departments WHERE name = 'Enterprise Operations Command Center' LIMIT 1)
    WHERE email IN (
      'chrome_superadmin@adios.com',
      'chrome_deptadmin@adios.com',
      'chrome_staff@adios.com'
    );
  END IF;
END $$;
