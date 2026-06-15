-- ==============================================================================
-- FIX RLS FUNCTIONALITY GAPS: WORKSPACES, TASKS, AND REQUIREMENTS
-- ==============================================================================

-- 1. FIX WORKSPACES POLICIES (Role name mismatch)
-- The application inserts 'manager', 'member' roles, but the previous RLS
-- was checking for 'WORKSPACE_MANAGER' or 'WORKSPACE_OWNER'.

DROP POLICY IF EXISTS "workspaces_strict_update" ON public.workspaces;
CREATE POLICY "workspaces_strict_update"
ON public.workspaces FOR UPDATE TO authenticated
USING (
  public.is_super_admin() OR
  workspace_owner_id = auth.uid() OR
  EXISTS (
      SELECT 1 FROM public.workspace_members wm 
      WHERE wm.workspace_id = workspaces.id AND wm.user_id = auth.uid() 
      AND wm.role IN ('WORKSPACE_OWNER', 'WORKSPACE_MANAGER', 'manager', 'owner') 
      AND wm.is_deleted = false
  )
);

DROP POLICY IF EXISTS "workspaces_strict_delete" ON public.workspaces;
CREATE POLICY "workspaces_strict_delete"
ON public.workspaces FOR DELETE TO authenticated
USING (public.is_super_admin() OR workspace_owner_id = auth.uid());


-- 2. FIX TASKS POLICIES (Role name mismatch)

DROP POLICY IF EXISTS "tasks_strict_update" ON public.tasks;
CREATE POLICY "tasks_strict_update"
ON public.tasks FOR UPDATE TO authenticated
USING (
  public.is_super_admin() OR
  owner_id = auth.uid() OR
  assigned_to = auth.uid() OR
  EXISTS (SELECT 1 FROM public.task_participants tp WHERE tp.task_id = tasks.id AND tp.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = tasks.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('WORKSPACE_OWNER', 'WORKSPACE_MANAGER', 'manager', 'owner') AND wm.is_deleted = false)
);

DROP POLICY IF EXISTS "tasks_strict_delete" ON public.tasks;
CREATE POLICY "tasks_strict_delete"
ON public.tasks FOR DELETE TO authenticated
USING (
  public.is_super_admin() OR
  owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = tasks.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('WORKSPACE_OWNER', 'WORKSPACE_MANAGER', 'manager', 'owner') AND wm.is_deleted = false)
);


-- 3. FIX REQUIREMENTS POLICIES (Massive Vulnerability / Open RLS Bypass)
-- Previously set to ALL TO authenticated USING (auth.uid() IS NOT NULL);
-- This allowed any user to update/delete any requirement.

ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requirements Access" ON public.requirements;
DROP POLICY IF EXISTS "policy_requirements_select" ON public.requirements;
DROP POLICY IF EXISTS "policy_requirements_insert" ON public.requirements;
DROP POLICY IF EXISTS "policy_requirements_update" ON public.requirements;
DROP POLICY IF EXISTS "policy_requirements_delete" ON public.requirements;
DROP POLICY IF EXISTS "policy_unified_requirements" ON public.requirements;

-- SELECT POLICY: Users can see requirements if they created them, are assigned analysts, 
-- are approvers/watchers, manage the department, or have global permissions.
CREATE POLICY "requirements_strict_select"
ON public.requirements FOR SELECT TO authenticated
USING (
  public.is_super_admin() OR
  created_by = auth.uid() OR
  assigned_analyst_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.requirement_watchers rw WHERE rw.requirement_id = requirements.id AND rw.user_id = auth.uid() AND rw.is_deleted = false) OR
  EXISTS (SELECT 1 FROM public.requirement_approvals ra WHERE ra.requirement_id = requirements.id AND ra.approver_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.departments d WHERE d.id = requirements.department_id AND d.manager_id = auth.uid() AND d.is_deleted = false)
);

-- INSERT POLICY: Restricted by application logic (Server Actions), but at DB level we require auth.
CREATE POLICY "requirements_strict_insert"
ON public.requirements FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE POLICY: Only Creator, Analyst, Approver, or Admin can update.
CREATE POLICY "requirements_strict_update"
ON public.requirements FOR UPDATE TO authenticated
USING (
  public.is_super_admin() OR
  created_by = auth.uid() OR
  assigned_analyst_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.requirement_approvals ra WHERE ra.requirement_id = requirements.id AND ra.approver_id = auth.uid())
);

-- DELETE POLICY: Only Super Admin can delete requirements.
CREATE POLICY "requirements_strict_delete"
ON public.requirements FOR DELETE TO authenticated
USING (
  public.is_super_admin()
);
