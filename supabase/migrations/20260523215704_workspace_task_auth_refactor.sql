-- ============================================================================
-- ADIOS PLATFORM MIGRATION - Workspace & Task Authorization Refactoring
-- ============================================================================

-- 1. Add Sub-Workspaces
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS parent_workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 2. Drop Task Assignment Tables
DROP TABLE IF EXISTS public.task_assignees CASCADE;
DROP TABLE IF EXISTS public.task_teams CASCADE;

-- 3. Simplify Workspace Authorization
-- Remove owner_id check from is_workspace_member. ANYONE in workspace_members or workspace_teams can CRUD.
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Super Admin Bypass
    IF public.has_permission_snapshot('WORKSPACES_MANAGE') THEN
        RETURN true;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.workspace_teams wt 
        JOIN public.team_members tm ON wt.team_id = tm.team_id 
        WHERE wt.workspace_id = p_workspace_id AND tm.user_id = auth.uid()
    );
END;
$$;

-- 4. Simplify Task Authorization
-- Remove creator, assignee, manager checks from is_task_member. Only rely on workspace access.
CREATE OR REPLACE FUNCTION public.is_task_member(p_task_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_workspace_id UUID;
BEGIN
    -- Super Admin Bypass
    IF public.has_permission_snapshot('WORKSPACES_MANAGE') THEN
        RETURN true;
    END IF;

    -- Handle both workspaces (legacy tasks linked to workspace_tasks) and public.tasks directly
    SELECT workspace_id INTO v_workspace_id FROM public.tasks WHERE id = p_task_id;
    
    -- Fallback for legacy architecture just in case
    IF v_workspace_id IS NULL THEN
        BEGIN
            SELECT workspace_id INTO v_workspace_id FROM public.workspace_tasks WHERE id = p_task_id;
        EXCEPTION WHEN undefined_table THEN
            v_workspace_id := NULL;
        END;
    END IF;

    IF v_workspace_id IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN public.is_workspace_member(v_workspace_id);
END;
$$;
