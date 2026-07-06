-- 20260521140000_fix_reference_table_selects.sql
-- Ensure authenticated users can SELECT from reference tables 
-- without needing super admin bypass, which allows tasks queries to fully populate.

DROP POLICY IF EXISTS policy_teams_basic_select ON public.teams;
CREATE POLICY policy_teams_basic_select ON public.teams
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS policy_task_teams_basic_select ON public.task_teams;
CREATE POLICY policy_task_teams_basic_select ON public.task_teams
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS policy_team_members_basic_select ON public.team_members;
CREATE POLICY policy_team_members_basic_select ON public.team_members
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS policy_task_assignees_basic_select ON public.task_assignees;
CREATE POLICY policy_task_assignees_basic_select ON public.task_assignees
FOR SELECT TO authenticated USING (true);

-- Ensure can_see_task is solid
CREATE OR REPLACE FUNCTION public.can_see_task(
    p_task_id UUID,
    p_creator_id UUID, 
    p_assignee_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    
    -- 7. Workspace Member Check (re-add this securely if it was missing!)
    IF p_task_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.workspace_tasks wt
        JOIN public.workspace_members wm ON wt.workspace_id = wm.workspace_id
        WHERE wt.id = p_task_id AND wm.user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;
