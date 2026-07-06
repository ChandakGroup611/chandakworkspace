-- ============================================================================
-- ADIOS PLATFORM: FINAL RLS CLEANUP & TEST SEEDING
-- ============================================================================

-- 1. ERADICATE ALL POTENTIALLY RECURSIVE LEGACY POLICIES ON USER_MASTER
DROP POLICY IF EXISTS "policy_user_master_ultimate" ON public.user_master;
DROP POLICY IF EXISTS "policy_user_master_select_v2" ON public.user_master;
DROP POLICY IF EXISTS "policy_user_master_update" ON public.user_master;
DROP POLICY IF EXISTS "policy_user_master_select" ON public.user_master;
DROP POLICY IF EXISTS "policy_user_master_mutate" ON public.user_master;
DROP POLICY IF EXISTS "policy_user_master_governance" ON public.user_master;

-- 2. REINSTATE ONLY THE STABLE, NON-RECURSIVE UNIFIED POLICY
DROP POLICY IF EXISTS "policy_unified_personnel" ON public.user_master;
DROP POLICY IF EXISTS "policy_unified_personnel" ON public.user_master;
DROP POLICY IF EXISTS "policy_unified_personnel" ON public.user_master;
CREATE POLICY "policy_unified_personnel" ON public.user_master FOR ALL TO authenticated USING (
    public.can_access_record(id, manager_id, department_id)
);

-- 3. FIX TASK CREATION FOREIGN KEY FAILURES (Assign Test Users to a Department)
-- We map the newly created browser test users to the "Enterprise Operations Command Center"
UPDATE public.user_master 
SET department_id = (SELECT id FROM public.departments WHERE name = 'Enterprise Operations Command Center' LIMIT 1)
WHERE email IN (
    'chrome_superadmin@adios.com',
    'chrome_deptadmin@adios.com',
    'chrome_staff@adios.com'
);
