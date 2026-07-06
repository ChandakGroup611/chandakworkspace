-- 20260521131000_fix_ambiguous_columns.sql
-- Fixes "column reference 'id' is ambiguous" error in RLS policies by fully qualifying table names.

-- Fix workspace_tasks policy
DROP POLICY IF EXISTS policy_tasks_select ON public.workspace_tasks;
DROP POLICY IF EXISTS policy_tasks_select ON public.workspace_tasks;
CREATE POLICY policy_tasks_select ON public.workspace_tasks FOR SELECT TO authenticated
USING (public.can_see_task(workspace_tasks.id, workspace_tasks.creator_id, workspace_tasks.assignee_id));

-- Fix workspaces policy
DROP POLICY IF EXISTS policy_workspaces_select ON public.workspaces;
DROP POLICY IF EXISTS policy_workspaces_select ON public.workspaces;
CREATE POLICY policy_workspaces_select ON public.workspaces FOR SELECT TO authenticated
USING (public.can_see_workspace(workspaces.id, workspaces.owner_id));

-- Fix tickets policy just in case it had ambiguous id earlier
DROP POLICY IF EXISTS policy_tickets_select ON public.tickets;
DROP POLICY IF EXISTS policy_tickets_select ON public.tickets;
CREATE POLICY policy_tickets_select ON public.tickets FOR SELECT TO authenticated
USING (public.can_see_record(tickets.creator_id, tickets.assignee_id));

-- Fix requirements policy just in case
DROP POLICY IF EXISTS policy_requirements_select ON public.requirements;
DROP POLICY IF EXISTS policy_requirements_select ON public.requirements;
CREATE POLICY policy_requirements_select ON public.requirements FOR SELECT TO authenticated
USING (public.can_see_record(requirements.creator_id, NULL));
