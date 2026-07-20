-- 20260802000000_fix_super_admin_leakage.sql
-- Removes the universal is_super_admin() bypass from transactional tables 
-- to prevent cross-data visibility leakage, forcing SUPER ADMINs to rely on 
-- the already-defined capability matrix (can_access_record).

-- ------------------------------------------------------------------------------
-- 1. TASKS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "tasks_strict_select" ON public.tasks;
CREATE POLICY "tasks_strict_select" ON public.tasks FOR SELECT TO authenticated
USING (
  owner_id = auth.uid() OR
  assigned_to = auth.uid() OR
  EXISTS (SELECT 1 FROM public.task_participants tp WHERE tp.task_id = tasks.id AND tp.user_id = auth.uid()) OR
  (public.has_permission_snapshot('TASKS_VIEW') AND public.can_access_record(owner_id, assigned_to, department_id))
);

DROP POLICY IF EXISTS "tasks_strict_update" ON public.tasks;
CREATE POLICY "tasks_strict_update" ON public.tasks FOR UPDATE TO authenticated
USING (
  owner_id = auth.uid() OR
  assigned_to = auth.uid() OR
  EXISTS (SELECT 1 FROM public.task_participants tp WHERE tp.task_id = tasks.id AND tp.user_id = auth.uid()) OR
  (public.has_permission_snapshot('TASKS_UPDATE') AND public.can_access_record(owner_id, assigned_to, department_id))
);

DROP POLICY IF EXISTS "tasks_strict_delete" ON public.tasks;
CREATE POLICY "tasks_strict_delete" ON public.tasks FOR DELETE TO authenticated
USING (
  owner_id = auth.uid() OR
  (public.has_permission_snapshot('TASKS_DELETE') AND public.can_access_record(owner_id, NULL, department_id))
);

-- ------------------------------------------------------------------------------
-- 2. TICKETS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_tickets_select ON public.tickets;
CREATE POLICY policy_tickets_select ON public.tickets FOR SELECT TO authenticated
USING (
  creator_id = auth.uid() OR
  assignee_id = auth.uid() OR
  (public.has_permission_snapshot('TICKETS_VIEW') AND public.can_access_record(creator_id, assignee_id, department_id))
);

DROP POLICY IF EXISTS policy_tickets_update ON public.tickets;
CREATE POLICY policy_tickets_update ON public.tickets FOR UPDATE TO authenticated
USING (
  creator_id = auth.uid() OR
  assignee_id = auth.uid() OR
  (public.has_permission_snapshot('TICKETS_UPDATE') AND public.can_access_record(creator_id, assignee_id, department_id))
);

DROP POLICY IF EXISTS policy_tickets_delete ON public.tickets;
CREATE POLICY policy_tickets_delete ON public.tickets FOR DELETE TO authenticated
USING (
  creator_id = auth.uid() OR
  (public.has_permission_snapshot('TICKETS_DELETE') AND public.can_access_record(creator_id, NULL, department_id))
);

-- ------------------------------------------------------------------------------
-- 3. REQUIREMENTS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_requirements_select ON public.requirements;
CREATE POLICY policy_requirements_select ON public.requirements FOR SELECT TO authenticated
USING (
  creator_id = auth.uid() OR
  (public.has_permission_snapshot('REQUIREMENTS_VIEW') AND public.can_access_record(creator_id, NULL, department_id))
);

DROP POLICY IF EXISTS policy_requirements_update ON public.requirements;
CREATE POLICY policy_requirements_update ON public.requirements FOR UPDATE TO authenticated
USING (
  creator_id = auth.uid() OR
  (public.has_permission_snapshot('REQUIREMENTS_UPDATE') AND public.can_access_record(creator_id, NULL, department_id))
);

DROP POLICY IF EXISTS policy_requirements_delete ON public.requirements;
CREATE POLICY policy_requirements_delete ON public.requirements FOR DELETE TO authenticated
USING (
  creator_id = auth.uid() OR
  (public.has_permission_snapshot('REQUIREMENTS_DELETE') AND public.can_access_record(creator_id, NULL, department_id))
);

-- ------------------------------------------------------------------------------
-- 4. WORKSPACES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_workspaces_select ON public.workspaces;
CREATE POLICY policy_workspaces_select ON public.workspaces FOR SELECT TO authenticated
USING (
  public.is_workspace_member(id) OR
  (public.has_permission_snapshot('WORKSPACES_VIEW') AND public.can_access_record(created_by, NULL, department_id))
);
