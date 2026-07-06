-- 20260605150000_strict_isolation_rls.sql
-- Implements the definitive strict security model for Workspaces and Tasks

-- ------------------------------------------------------------------------------
-- 1. STRICT TASK POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "tasks_strict_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_strict_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_strict_select" ON public.tasks;
CREATE POLICY "tasks_strict_select" ON public.tasks FOR SELECT TO authenticated
USING (
  public.is_super_admin() OR
  owner_id = auth.uid() OR
  assigned_to = auth.uid() OR
  EXISTS (SELECT 1 FROM public.task_participants tp WHERE tp.task_id = tasks.id AND tp.user_id = auth.uid())
);

DROP POLICY IF EXISTS "tasks_strict_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_strict_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_strict_update" ON public.tasks;
CREATE POLICY "tasks_strict_update" ON public.tasks FOR UPDATE TO authenticated
USING (
  public.is_super_admin() OR
  owner_id = auth.uid() OR
  assigned_to = auth.uid() OR
  EXISTS (SELECT 1 FROM public.task_participants tp WHERE tp.task_id = tasks.id AND tp.user_id = auth.uid())
);

DROP POLICY IF EXISTS "tasks_strict_delete" ON public.tasks;
DROP POLICY IF EXISTS "tasks_strict_delete" ON public.tasks;
DROP POLICY IF EXISTS "tasks_strict_delete" ON public.tasks;
CREATE POLICY "tasks_strict_delete" ON public.tasks FOR DELETE TO authenticated
USING (
  public.is_super_admin() OR
  owner_id = auth.uid()
);

-- ------------------------------------------------------------------------------
-- 2. STRICT TASK PARTICIPANTS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "task_participants_select" ON public.task_participants;
DROP POLICY IF EXISTS "task_participants_select" ON public.task_participants;
DROP POLICY IF EXISTS "task_participants_select" ON public.task_participants;
CREATE POLICY "task_participants_select" ON public.task_participants FOR SELECT TO authenticated
USING (
  public.is_super_admin() OR
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.tasks t 
    WHERE t.id = task_participants.task_id 
    AND (
      t.owner_id = auth.uid() OR 
      t.assigned_to = auth.uid() OR
      EXISTS (SELECT 1 FROM public.task_participants tp2 WHERE tp2.task_id = t.id AND tp2.user_id = auth.uid())
    )
  )
);

-- ------------------------------------------------------------------------------
-- 3. STRICT SUB-TASKS POLICIES (Handled implicitly by tasks_strict_select)
-- ------------------------------------------------------------------------------
