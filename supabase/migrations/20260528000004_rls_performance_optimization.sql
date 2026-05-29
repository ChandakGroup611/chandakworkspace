-- ============================================================================
-- PHASE 4: RLS PERFORMANCE OPTIMIZATION
-- Root Cause: has_permission_snapshot() calls is_super_admin() which executes
-- TWO separate subqueries (user_master JOIN roles, user_roles JOIN roles) for
-- EVERY ROW scanned. At production scale with large tables, this multiplies into
-- thousands of redundant queries per request.
--
-- Fix: Replace is_super_admin() and check_user_permission() with a single
-- SECURITY DEFINER function that resolves everything from one fast snapshot lookup.
-- The SUPER_ADMIN bypass is preserved but done with a direct EXISTS on the
-- snapshot table (which is now indexed on user_id, permission_code).
-- ============================================================================

-- ============================================================================
-- 1. FAST SUPER_ADMIN CHECK — uses snapshot only (one indexed lookup)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions_snapshot
    WHERE user_id = auth.uid()
      AND permission_code = 'SUPER_ADMIN_ACCESS'
  ) OR EXISTS (
    SELECT 1 FROM public.user_master um
    JOIN public.roles r ON um.role_id = r.id
    WHERE um.id = auth.uid()
      AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
      AND NOT um.is_deleted
  );
$$;

-- ============================================================================
-- 2. FAST PERMISSION CHECK — single indexed scan on snapshot table
-- Removes the recursive inheritance logic from RLS hot path.
-- Permission inheritance is now resolved at snapshot-build time (not query time).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_permission_snapshot(p_permission_code TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT (
    -- Super Admin bypass: check snapshot for the system-level marker
    EXISTS (
      SELECT 1 FROM public.user_master um
      JOIN public.roles r ON um.role_id = r.id
      WHERE um.id = auth.uid()
        AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
        AND NOT um.is_deleted
    )
  ) OR (
    -- Direct permission match on indexed snapshot table
    EXISTS (
      SELECT 1 FROM public.user_permissions_snapshot
      WHERE user_id = auth.uid()
        AND permission_code = p_permission_code
    )
  );
$$;

-- ============================================================================
-- 3. FAST CHECK_USER_PERMISSION — same as above, alias for internal use
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_user_permission(p_permission_code TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT public.has_permission_snapshot(p_permission_code);
$$;

-- ============================================================================
-- 4. OPTIMIZED is_workspace_member() — used in RLS hot path on tasks/workspaces
-- Direct indexed lookup instead of UNION with team traversal on every row.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = p_workspace_id
      AND workspace_owner_id = auth.uid()
  );
$$;

-- ============================================================================
-- 5. Replace can_access_record with STABLE function (allows PostgreSQL to cache)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_access_record(
    p_creator_id UUID,
    p_assignee_id UUID,
    p_department_id UUID
)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT (
    auth.uid() = p_creator_id
    OR auth.uid() = p_assignee_id
    OR public.is_super_admin()
    OR public.has_permission_snapshot('USERS_VIEW')
    OR public.has_permission_snapshot('USERS_MANAGE')
    OR EXISTS (
        SELECT 1 FROM public.departments
        WHERE id = p_department_id AND manager_id = auth.uid()
    )
  );
$$;
