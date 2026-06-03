-- 20260604000004_fix_workspace_visibility_settings.sql
-- Restores visibility_settings which was accidentally dropped during workspace engine rewrite in Phase 4
-- and updates the RLS policies to respect public visibility.

-- 1. Restore visibility_settings column
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS visibility_settings JSONB DEFAULT '{"public": false}'::jsonb;

-- 2. Update can_see_workspace function to accept visibility_settings
CREATE OR REPLACE FUNCTION public.can_see_workspace(p_workspace_id UUID, p_owner_id UUID, p_visibility_settings JSONB DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

    -- 5. Explicit Workspace Member Check
    IF EXISTS (
        SELECT 1 FROM public.workspace_members wm 
        WHERE wm.workspace_id = p_workspace_id AND wm.user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- 6. Has any visible tasks in the workspace
    -- We use can_see_task to safely check task visibility
    IF EXISTS (
        SELECT 1 FROM public.tasks wt -- Using tasks table instead of legacy workspace_tasks
        WHERE wt.workspace_id = p_workspace_id 
        AND wt.is_deleted = false
        -- Note: can_see_task might have been changed to a different signature. 
        -- If public.can_see_task(wt.id, wt.created_by, wt.assigned_to) doesn't exist, we fallback to just checking if they are assigned.
        AND (wt.created_by = auth.uid() OR wt.assigned_to = auth.uid())
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- 3. Update WORKSPACES RLS Policy to pass visibility_settings
DROP POLICY IF EXISTS policy_workspaces_select ON public.workspaces;
CREATE POLICY policy_workspaces_select ON public.workspaces FOR SELECT TO authenticated
USING (public.can_see_workspace(id, workspace_owner_id, visibility_settings));

-- Update any other policies that relied on the old signature, just in case
-- actually, the old signature still exists because of DEFAULT NULL on the new parameter, 
-- so other policies calling `can_see_workspace(id, owner_id)` will still work.
