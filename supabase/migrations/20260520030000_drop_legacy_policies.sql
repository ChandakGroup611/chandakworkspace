-- ============================================================================
-- ADIOS PLATFORM: Drop legacy RLS policies referencing obsolete snapshot schema
-- ============================================================================

-- Drop legacy policies on user_master referencing 'permissions'
DROP POLICY IF EXISTS policy_user_master_select ON public.user_master;
DROP POLICY IF EXISTS policy_user_master_select_v2 ON public.user_master;
DROP POLICY IF EXISTS policy_user_master_mutate ON public.user_master;
DROP POLICY IF EXISTS policy_user_master_update ON public.user_master;

-- Drop legacy policy on user_permissions_snapshot if any
DROP POLICY IF EXISTS policy_ups_all ON public.user_permissions_snapshot;
