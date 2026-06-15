-- ============================================================================
-- PHASE C4: FINAL CUTOVER
-- Removes global SUPER_ADMIN bypasses from database helper functions.
-- Enforces explicit IAM snapshot authorization.
-- Optimizes auth.uid() by wrapping in (SELECT auth.uid()) for 100x performance.
-- ============================================================================

-- 1. Redefine has_permission_snapshot (Strict IAM + Performance Optimized)
CREATE OR REPLACE FUNCTION public.has_permission_snapshot(p_permission_code TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions_snapshot
    WHERE user_id = (SELECT auth.uid())
      AND permission_code = p_permission_code
  );
$$;

-- 2. Redefine is_workspace_member (Performance Optimized)
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = (SELECT auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = p_workspace_id
      AND workspace_owner_id = (SELECT auth.uid())
  );
$$;

-- 3. Redefine can_access_record (Performance Optimized + Strict IAM)
CREATE OR REPLACE FUNCTION public.can_access_record(
    p_creator_id UUID,
    p_assignee_id UUID,
    p_department_id UUID
)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT (
    (SELECT auth.uid()) = p_creator_id
    OR (SELECT auth.uid()) = p_assignee_id
    OR public.has_permission_snapshot('USERS_VIEW')
    OR public.has_permission_snapshot('USERS_MANAGE')
    OR EXISTS (
        SELECT 1 FROM public.departments
        WHERE id = p_department_id AND manager_id = (SELECT auth.uid())
    )
  );
$$;

-- 4. Redefine is_super_admin (Strict mapping + Performance Optimized)
-- This function is now legacy, but we map it explicitly to a specific snapshot
-- capability rather than assuming it's a global master key.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions_snapshot
    WHERE user_id = (SELECT auth.uid())
      AND permission_code = 'SUPER_ADMIN_ACCESS'
  );
$$;
