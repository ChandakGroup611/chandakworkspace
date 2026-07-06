-- 20260605160000_fix_task_rls_recursion.sql

-- 1. Create a SECURITY DEFINER function to break the recursion loop
CREATE OR REPLACE FUNCTION public.check_task_access(target_task_id uuid, target_user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Super admin check
  IF public.is_super_admin() THEN
    RETURN true;
  END IF;

  -- Check if user is owner or assignee on the task itself
  IF EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = target_task_id
    AND (owner_id = target_user_id OR assigned_to = target_user_id)
  ) THEN
    RETURN true;
  END IF;

  -- Check if user is a participant
  IF EXISTS (
    SELECT 1 FROM public.task_participants
    WHERE task_id = target_task_id
    AND user_id = target_user_id
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update task_participants policy to use the function
DROP POLICY IF EXISTS "task_participants_select" ON public.task_participants;
DROP POLICY IF EXISTS "task_participants_select" ON public.task_participants;
DROP POLICY IF EXISTS "task_participants_select" ON public.task_participants;
CREATE POLICY "task_participants_select" ON public.task_participants FOR SELECT TO authenticated
USING (
  public.check_task_access(task_id, auth.uid())
);

-- 3. Update tasks policy to use the function to ensure consistency and avoid any other loops
DROP POLICY IF EXISTS "tasks_strict_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_strict_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_strict_select" ON public.tasks;
CREATE POLICY "tasks_strict_select" ON public.tasks FOR SELECT TO authenticated
USING (
  public.check_task_access(id, auth.uid())
);

DROP POLICY IF EXISTS "tasks_strict_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_strict_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_strict_update" ON public.tasks;
CREATE POLICY "tasks_strict_update" ON public.tasks FOR UPDATE TO authenticated
USING (
  public.check_task_access(id, auth.uid())
);
