-- ==============================================================================
-- Migration: Fix Super Admin Bypass, RBAC Snapshot, Workspace Members RLS
-- ==============================================================================

-- 1. Canonical is_super_admin() Function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_master um
    JOIN public.roles r ON um.role_id = r.id
    WHERE um.id = auth.uid()
      AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
      AND NOT um.is_deleted
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
  ) OR EXISTS (
    SELECT 1 FROM public.user_permissions_snapshot
    WHERE user_id = auth.uid()
      AND permission_code IN ('SUPER_ADMIN', 'SUPER_ADMIN_ACCESS')
  ) OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') IN ('SUPER_ADMIN', 'ROLE_ADMIN');
$$;

-- 2. Canonical has_permission_snapshot() with Super Admin bypass
CREATE OR REPLACE FUNCTION public.has_permission_snapshot(p_permission_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.user_permissions_snapshot
    WHERE user_id = (SELECT auth.uid())
      AND permission_code = p_permission_code
  );
$$;

-- 3. Check User Permission
CREATE OR REPLACE FUNCTION public.check_user_permission(p_permission_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT public.has_permission_snapshot(p_permission_code);
$$;

-- 4. Fix can_see_workspace (1-arg overload)
CREATE OR REPLACE FUNCTION public.can_see_workspace(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$ 
BEGIN 
    IF public.is_super_admin() THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.workspaces WHERE id = p_workspace_id AND workspace_owner_id = auth.uid()) THEN RETURN TRUE; END IF; 
    IF EXISTS (
        SELECT 1 FROM public.workspaces w 
        JOIN public.user_master u ON w.company_id = u.department_id 
        JOIN public.roles r ON u.role_id = r.id 
        WHERE w.id = p_workspace_id AND u.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN', 'COMPANY_ADMIN', 'COMPANY_OWNER')
    ) THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = p_workspace_id AND wm.user_id = auth.uid() AND wm.is_deleted = false) THEN RETURN TRUE; END IF; 
    IF EXISTS (SELECT 1 FROM public.tasks t WHERE t.workspace_id = p_workspace_id AND t.is_deleted = false AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM public.task_participants ta WHERE ta.task_id = t.id AND ta.user_id = auth.uid()))) THEN RETURN TRUE; END IF; 
    RETURN FALSE; 
END; 
$$;

-- 5. Fix check_task_access
CREATE OR REPLACE FUNCTION public.check_task_access(target_task_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Super admin check
  IF public.is_super_admin() THEN
    RETURN true;
  END IF;

  -- Check if user is owner or assignee on the task itself
  IF EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = target_task_id
    AND (owner_id = target_user_id OR assigned_to = target_user_id)
  ) THEN
    RETURN true;
  END IF;

  -- Check if user is a participant
  IF EXISTS (
    SELECT 1 FROM public.task_participants
    WHERE task_id = target_task_id
    AND user_id = target_user_id
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 6. Add CRUD RLS policies on workspace_members
DROP POLICY IF EXISTS workspace_members_strict_insert ON public.workspace_members;
CREATE POLICY workspace_members_strict_insert ON public.workspace_members
FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id AND (
      w.workspace_owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = w.id AND wm.user_id = auth.uid() AND wm.is_deleted = false AND wm.role IN ('manager', 'WORKSPACE_MANAGER', 'owner', 'WORKSPACE_OWNER')
      )
    )
  )
);

DROP POLICY IF EXISTS workspace_members_strict_update ON public.workspace_members;
CREATE POLICY workspace_members_strict_update ON public.workspace_members
FOR UPDATE TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id AND (
      w.workspace_owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = w.id AND wm.user_id = auth.uid() AND wm.is_deleted = false AND wm.role IN ('manager', 'WORKSPACE_MANAGER', 'owner', 'WORKSPACE_OWNER')
      )
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id AND (
      w.workspace_owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = w.id AND wm.user_id = auth.uid() AND wm.is_deleted = false AND wm.role IN ('manager', 'WORKSPACE_MANAGER', 'owner', 'WORKSPACE_OWNER')
      )
    )
  )
);

DROP POLICY IF EXISTS workspace_members_strict_delete ON public.workspace_members;
CREATE POLICY workspace_members_strict_delete ON public.workspace_members
FOR DELETE TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id AND (
      w.workspace_owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = w.id AND wm.user_id = auth.uid() AND wm.is_deleted = false AND wm.role IN ('manager', 'WORKSPACE_MANAGER', 'owner', 'WORKSPACE_OWNER')
      )
    )
  )
);

-- 7. Ensure SUPER_ADMIN permission mapping and snapshot refresh
DO $$
DECLARE
    v_perm_id UUID;
    v_role_id UUID;
    v_usr RECORD;
BEGIN
    SELECT id INTO v_perm_id FROM public.permissions WHERE code = 'SUPER_ADMIN' LIMIT 1;
    SELECT id INTO v_role_id FROM public.roles WHERE code = 'SUPER_ADMIN' LIMIT 1;

    IF v_perm_id IS NOT NULL AND v_role_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        VALUES (v_role_id, v_perm_id)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Refresh snapshots for all super admin users
    FOR v_usr IN (
        SELECT um.id AS user_id FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        WHERE r.code = 'SUPER_ADMIN'
        UNION
        SELECT ur.user_id FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE r.code = 'SUPER_ADMIN'
    ) LOOP
        PERFORM public.refresh_single_user_permissions_snapshot(v_usr.user_id);
    END LOOP;
END $$;
