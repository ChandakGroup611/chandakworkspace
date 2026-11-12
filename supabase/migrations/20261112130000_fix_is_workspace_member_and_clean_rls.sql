-- ==============================================================================
-- Migration: Fix is_workspace_member Super Admin Bypass and Clean Up RLS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = (SELECT auth.uid())
      AND NOT is_deleted
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = p_workspace_id
      AND workspace_owner_id = (SELECT auth.uid())
  );
$$;

-- Also update 3-arg can_see_workspace to ensure deleted workspace_members are excluded
CREATE OR REPLACE FUNCTION public.can_see_workspace(p_workspace_id uuid, p_owner_id uuid, p_visibility_settings jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- 1. SUPER_ADMIN bypass
    IF public.is_super_admin() THEN
        RETURN TRUE;
    END IF;

    -- 2. Public Visibility Check
    IF COALESCE((p_visibility_settings ->> 'public')::boolean, false) = true THEN
        RETURN TRUE;
    END IF;

    -- 3. Owner Check
    IF auth.uid() = p_owner_id THEN
        RETURN TRUE;
    END IF;

    -- 4. Owner's Manager Check
    IF p_owner_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.user_master 
        WHERE id = p_owner_id AND manager_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- 5. Explicit Workspace Member Check (non-deleted)
    IF EXISTS (
        SELECT 1 FROM public.workspace_members wm 
        WHERE wm.workspace_id = p_workspace_id AND wm.user_id = auth.uid() AND NOT wm.is_deleted
    ) THEN
        RETURN TRUE;
    END IF;

    -- 6. Has any visible tasks in the workspace
    IF EXISTS (
        SELECT 1 FROM public.tasks wt
        WHERE wt.workspace_id = p_workspace_id 
        AND wt.is_deleted = false
        AND (wt.created_by = auth.uid() OR wt.assigned_to = auth.uid() OR EXISTS (
            SELECT 1 FROM public.task_participants tp WHERE tp.task_id = wt.id AND tp.user_id = auth.uid()
        ))
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;
