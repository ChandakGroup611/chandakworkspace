-- 20260520060000_permanent_visibility_scoping.sql
-- Description: Permanently fixes visibility scoping for Tickets, Tasks, Requirements, and Workspaces.
-- Adds creator's manager visibility.

-- 1. Create Universal Visibility Function
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

    -- 3. Creator's Manager Check (The user is the manager of the creator)
    IF p_creator_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.user_master 
        WHERE id = p_creator_id AND manager_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- 2. Rewrite TICKETS Policies
DROP POLICY IF EXISTS policy_tickets_select ON public.tickets;
CREATE POLICY policy_tickets_select ON public.tickets FOR SELECT TO authenticated
USING (
    public.can_see_record(creator_id, assignee_id)
    OR public.check_user_permission('TICKETS_VIEW')
    OR public.check_user_permission('TICKETS_MANAGE')
);

-- 3. Rewrite TASKS (workspace_tasks) Policies
DROP POLICY IF EXISTS policy_tasks_select ON public.workspace_tasks;
CREATE POLICY policy_tasks_select ON public.workspace_tasks FOR SELECT TO authenticated
USING (
    public.can_see_record(creator_id, assignee_id)
    OR public.check_user_permission('TASKS_VIEW')
    OR public.check_user_permission('TASKS_MANAGE')
);

-- 4. Rewrite REQUIREMENTS Policies
-- Note: requirements table only has creator_id, no assignee_id
DROP POLICY IF EXISTS policy_requirements_select ON public.requirements;
CREATE POLICY policy_requirements_select ON public.requirements FOR SELECT TO authenticated
USING (
    public.can_see_record(creator_id, NULL)
    OR public.check_user_permission('REQUIREMENTS_VIEW')
    OR public.check_user_permission('REQUIREMENTS_MANAGE')
);

-- 5. Rewrite WORKSPACES Policies
-- Note: workspaces table has owner_id instead of creator_id, and no assignee_id
DROP POLICY IF EXISTS policy_workspaces_select ON public.workspaces;
CREATE POLICY policy_workspaces_select ON public.workspaces FOR SELECT TO authenticated
USING (
    public.can_see_record(owner_id, NULL)
    OR public.check_user_permission('WORKSPACES_VIEW')
    OR public.check_user_permission('WORKSPACES_MANAGE')
    OR EXISTS (
        SELECT 1 FROM public.workspace_members wm 
        WHERE wm.workspace_id = id AND wm.user_id = auth.uid()
    )
);

-- 6. Fix Realtime Chat: Ensure REPLICA IDENTITY FULL on task_chat_messages
-- Required for Supabase Realtime postgres_changes to deliver the full row payload
ALTER TABLE public.task_chat_messages REPLICA IDENTITY FULL;

-- Ensure task_chat_messages is in the supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'task_chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.task_chat_messages;
    END IF;
END $$;

-- 7. Fix task_chat_messages RLS — allow any authenticated user who can see the task
DROP POLICY IF EXISTS policy_task_chat_select ON public.task_chat_messages;
DROP POLICY IF EXISTS policy_task_chat_insert ON public.task_chat_messages;

CREATE POLICY policy_task_chat_select ON public.task_chat_messages FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.workspace_tasks wt
        WHERE wt.id = task_id
        AND (
            wt.creator_id = auth.uid()
            OR wt.assignee_id = auth.uid()
            OR public.is_workspace_member(wt.workspace_id)
            OR EXISTS (SELECT 1 FROM public.user_master WHERE id = wt.creator_id AND manager_id = auth.uid())
            OR public.is_super_admin()
        )
    )
);

CREATE POLICY policy_task_chat_insert ON public.task_chat_messages FOR INSERT TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.workspace_tasks wt
        WHERE wt.id = task_id
        AND (
            wt.creator_id = auth.uid()
            OR wt.assignee_id = auth.uid()
            OR public.is_workspace_member(wt.workspace_id)
            OR EXISTS (SELECT 1 FROM public.user_master WHERE id = wt.creator_id AND manager_id = auth.uid())
            OR public.is_super_admin()
        )
    )
);
