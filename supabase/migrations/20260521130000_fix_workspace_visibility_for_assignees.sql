-- 20260521130000_fix_workspace_visibility_for_assignees.sql
-- Fixes issue where a user assigned to a task couldn't see the workspace
-- if they weren't explicitly added to workspace_members.

CREATE OR REPLACE FUNCTION public.can_see_workspace(p_workspace_id UUID, p_owner_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- 1. SUPER_ADMIN bypass
    IF public.is_super_admin() THEN
        RETURN TRUE;
    END IF;

    -- 2. Owner Check
    IF auth.uid() = p_owner_id THEN
        RETURN TRUE;
    END IF;

    -- 3. Owner's Manager Check
    IF p_owner_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.user_master 
        WHERE id = p_owner_id AND manager_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- 4. Explicit Workspace Member Check
    IF EXISTS (
        SELECT 1 FROM public.workspace_members wm 
        WHERE wm.workspace_id = p_workspace_id AND wm.user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- 5. Has any visible tasks in the workspace
    -- We use can_see_task to safely check task visibility
    IF EXISTS (
        SELECT 1 FROM public.workspace_tasks wt
        WHERE wt.workspace_id = p_workspace_id 
        AND public.can_see_task(wt.id, wt.creator_id, wt.assignee_id)
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- Update WORKSPACES RLS Policy to use the new unified function
DROP POLICY IF EXISTS policy_workspaces_select ON public.workspaces;
CREATE POLICY policy_workspaces_select ON public.workspaces FOR SELECT TO authenticated
USING (public.can_see_workspace(id, owner_id));
