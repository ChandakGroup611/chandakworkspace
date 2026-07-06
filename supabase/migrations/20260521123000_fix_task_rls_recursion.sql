-- 20260521123000_fix_task_rls_recursion.sql
-- Fixes infinite recursion by moving nested relation checks (task_teams, task_assignees)
-- into a SECURITY DEFINER function that bypasses RLS for the checks.

CREATE OR REPLACE FUNCTION public.can_see_task(
    p_task_id UUID,
    p_creator_id UUID, 
    p_assignee_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- 1. SUPER_ADMIN bypass (using our bulletproof view)
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

    -- 5. Explicit Assignees (from task_assignees)
    IF p_task_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.task_assignees 
        WHERE task_id = p_task_id AND user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- 6. Team Members (from task_teams)
    IF p_task_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.task_teams tt
        JOIN public.team_members tm ON tt.team_id = tm.team_id
        WHERE tt.task_id = p_task_id AND tm.user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- Replace the workspace_tasks SELECT policy with the single, recursion-free function call
DROP POLICY IF EXISTS policy_tasks_select ON public.workspace_tasks;
DROP POLICY IF EXISTS policy_tasks_select ON public.workspace_tasks;
CREATE POLICY policy_tasks_select ON public.workspace_tasks FOR SELECT TO authenticated
USING (public.can_see_task(id, creator_id, assignee_id));

