-- ==========================================
-- Enterprise Governance RLS Optimization
-- Restoring Task Collaboration, Remarks, and Team Assignments
-- Migration: 20260519000000_workspace_collaboration_rls.sql
-- ==========================================

-- 1. Redefine workspace membership checker to bypass for Super Admins (WORKSPACES_MANAGE)
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
    ) OR EXISTS (
        SELECT 1 FROM public.workspaces WHERE id = p_workspace_id AND owner_id = auth.uid()
    );
END;
$$;

-- 2. Redefine task membership checker to bypass for Super Admins (WORKSPACES_MANAGE)
CREATE OR REPLACE FUNCTION public.is_task_member(p_task_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_workspace_id UUID;
    v_creator_id UUID;
    v_assignee_id UUID;
BEGIN
    -- Super Admin Bypass
    IF public.has_permission_snapshot('WORKSPACES_MANAGE') THEN
        RETURN true;
    END IF;

    SELECT workspace_id, creator_id, assignee_id INTO v_workspace_id, v_creator_id, v_assignee_id 
    FROM public.workspace_tasks WHERE id = p_task_id;
    
    RETURN (v_creator_id = auth.uid()) OR (v_assignee_id = auth.uid()) OR EXISTS (
        SELECT 1 FROM public.task_assignees ta
        LEFT JOIN public.user_master um ON ta.user_id = um.id
        WHERE ta.task_id = p_task_id AND (ta.user_id = auth.uid() OR um.manager_id = auth.uid())
    ) OR EXISTS (
        SELECT 1 FROM public.task_teams tt 
        JOIN public.team_members tm ON tt.team_id = tm.team_id 
        WHERE tt.task_id = p_task_id AND tm.user_id = auth.uid()
    ) OR public.is_workspace_member(v_workspace_id);
END;
$$;

-- 3. Establish RLS policies for task_comments (remarks)
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_task_comments_select ON public.task_comments;
DROP POLICY IF EXISTS policy_task_comments_insert ON public.task_comments;
DROP POLICY IF EXISTS policy_task_comments_all ON public.task_comments;

DROP POLICY IF EXISTS policy_task_comments_select ON public.task_comments;
CREATE POLICY policy_task_comments_select ON public.task_comments FOR SELECT TO authenticated USING (public.is_task_member(task_id));
DROP POLICY IF EXISTS policy_task_comments_insert ON public.task_comments;
CREATE POLICY policy_task_comments_insert ON public.task_comments FOR INSERT TO authenticated WITH CHECK (public.is_task_member(task_id));
DROP POLICY IF EXISTS policy_task_comments_all ON public.task_comments;
CREATE POLICY policy_task_comments_all ON public.task_comments FOR ALL TO authenticated USING (public.is_task_member(task_id));

-- 4. Establish RLS policies for task_teams (team enrollment)
ALTER TABLE public.task_teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_task_teams_select ON public.task_teams;
DROP POLICY IF EXISTS policy_task_teams_insert ON public.task_teams;
DROP POLICY IF EXISTS policy_task_teams_delete ON public.task_teams;
DROP POLICY IF EXISTS policy_task_teams_all ON public.task_teams;

DROP POLICY IF EXISTS policy_task_teams_select ON public.task_teams;
CREATE POLICY policy_task_teams_select ON public.task_teams FOR SELECT TO authenticated USING (public.is_task_member(task_id));
DROP POLICY IF EXISTS policy_task_teams_insert ON public.task_teams;
CREATE POLICY policy_task_teams_insert ON public.task_teams FOR INSERT TO authenticated WITH CHECK (public.is_task_member(task_id));
DROP POLICY IF EXISTS policy_task_teams_delete ON public.task_teams;
CREATE POLICY policy_task_teams_delete ON public.task_teams FOR DELETE TO authenticated USING (public.is_task_member(task_id));
DROP POLICY IF EXISTS policy_task_teams_all ON public.task_teams;
CREATE POLICY policy_task_teams_all ON public.task_teams FOR ALL TO authenticated USING (public.is_task_member(task_id));

-- 5. Add task_comments and task_teams to supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'task_comments') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'task_teams') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.task_teams;
    END IF;
END $$;
