-- 20260521111100_strict_visibility_scoping.sql
-- Fixes cross-scope leakage by removing generic SELECT bypasses while preserving IAM UPDATE/DELETE controls.

-- 1. Enhance can_see_record to include Assignee's Manager
CREATE OR REPLACE FUNCTION public.can_see_record(
    p_creator_id UUID, 
    p_assignee_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- 1. SUPER_ADMIN bypass
    IF public.is_super_admin() THEN
        RETURN TRUE;
    END IF;

    -- 2. Creator or Assignee Check
    IF auth.uid() = p_creator_id OR auth.uid() = p_assignee_id THEN
        RETURN TRUE;
    END IF;

    -- 3. Creator's Manager Check
    IF p_creator_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.user_master 
        WHERE id = p_creator_id AND manager_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- 4. Assignee's Manager Check
    IF p_assignee_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.user_master 
        WHERE id = p_assignee_id AND manager_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- 2. Rewrite SELECT policies to be STRICT
-- We drop the old SELECT policies and recreate them WITHOUT check_user_permission('..._VIEW')

-- TICKETS
DROP POLICY IF EXISTS policy_tickets_select ON public.tickets;
CREATE POLICY policy_tickets_select ON public.tickets FOR SELECT TO authenticated
USING (public.can_see_record(creator_id, assignee_id));

-- REQUIREMENTS
DROP POLICY IF EXISTS policy_requirements_select ON public.requirements;
CREATE POLICY policy_requirements_select ON public.requirements FOR SELECT TO authenticated
USING (public.can_see_record(creator_id, NULL));

-- WORKSPACE TASKS
DROP POLICY IF EXISTS policy_tasks_select ON public.workspace_tasks;
CREATE POLICY policy_tasks_select ON public.workspace_tasks FOR SELECT TO authenticated
USING (
    public.can_see_record(creator_id, assignee_id)
    OR EXISTS (
        -- Also visible if user is a member of the task's explicit team
        SELECT 1 FROM public.task_teams tt
        JOIN public.team_members tm ON tt.team_id = tm.team_id
        WHERE tt.task_id = workspace_tasks.id AND tm.user_id = auth.uid()
    )
    OR EXISTS (
        -- Also visible if user is an explicit assignee in task_assignees
        SELECT 1 FROM public.task_assignees ta
        WHERE ta.task_id = workspace_tasks.id AND ta.user_id = auth.uid()
    )
);

-- WORKSPACES
DROP POLICY IF EXISTS policy_workspaces_select ON public.workspaces;
CREATE POLICY policy_workspaces_select ON public.workspaces FOR SELECT TO authenticated
USING (
    public.can_see_record(owner_id, NULL)
    OR EXISTS (
        -- Visible if user is a member of the workspace
        SELECT 1 FROM public.workspace_members wm 
        WHERE wm.workspace_id = workspaces.id AND wm.user_id = auth.uid()
    )
);

-- 3. Explicit SUPER_ADMIN global CRUD for user_master
-- Re-apply a robust FOR ALL policy ensuring Super Admins can update any user's profile
DROP POLICY IF EXISTS policy_super_admin_bypass_all ON public.user_master;
CREATE POLICY policy_super_admin_bypass_all ON public.user_master
FOR ALL TO authenticated
USING (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'SUPER_ADMIN'
    OR (current_setting('adios.is_super_admin_check', true) IS DISTINCT FROM '1' AND public.is_super_admin())
)
WITH CHECK (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'SUPER_ADMIN'
    OR (current_setting('adios.is_super_admin_check', true) IS DISTINCT FROM '1' AND public.is_super_admin())
);
