-- ============================================================================
-- Phase 5: Hierarchical Authorization & RLS
-- ============================================================================

-- 1. Ensure RLS is enabled
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_tasks ENABLE ROW LEVEL SECURITY;

-- 2. Clean up old permissive/obsolete policies
DROP POLICY IF EXISTS "workspaces Access" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_members Access" ON public.workspace_members;
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "sub_tasks_select" ON public.sub_tasks;

-- 3. Workspace Visibility
-- A user can see a workspace if they are a member, OR if they are a SUPER_ADMIN
CREATE POLICY "workspaces_visibility" ON public.workspaces FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.workspace_members 
        WHERE workspace_members.workspace_id = workspaces.id 
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.is_deleted = false
    ) OR has_permission_snapshot('SUPER_ADMIN')
);

-- 4. Workspace Members Visibility
-- A user can see the members of a workspace if they are ALSO a member of that workspace, OR a SUPER_ADMIN
CREATE POLICY "workspace_members_visibility" ON public.workspace_members FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.workspace_members my_membership
        WHERE my_membership.workspace_id = workspace_members.workspace_id
        AND my_membership.user_id = auth.uid()
        AND my_membership.is_deleted = false
    ) OR has_permission_snapshot('SUPER_ADMIN')
);

-- 5. Tasks Visibility
-- A user can see a task if they are a member of its workspace, OR if they are the task assignee/owner, OR a SUPER_ADMIN
CREATE POLICY "tasks_visibility" ON public.tasks FOR SELECT TO authenticated USING (
    owner_id = auth.uid() OR
    assigned_to = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.workspace_members 
        WHERE workspace_members.workspace_id = tasks.workspace_id 
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.is_deleted = false
    ) OR has_permission_snapshot('SUPER_ADMIN')
);

-- 6. Sub Tasks Visibility
-- A user can see a sub_task if they are a member of the parent task's workspace, OR if they are the sub-task owner, OR a SUPER_ADMIN
CREATE POLICY "sub_tasks_visibility" ON public.sub_tasks FOR SELECT TO authenticated USING (
    owner_id = auth.uid() OR
    assigned_to = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.workspace_members wm ON t.workspace_id = wm.workspace_id
        WHERE t.id = sub_tasks.task_id 
        AND wm.user_id = auth.uid()
        AND wm.is_deleted = false
    ) OR has_permission_snapshot('SUPER_ADMIN')
);

-- Note: All INSERT, UPDATE, DELETE operations on these tables are handled by backend services
-- using the service_role key to bypass RLS, where explicit programmatic authorization logic 
-- (Owner vs Viewer) is enforced according to Phase 3/4 rules.
