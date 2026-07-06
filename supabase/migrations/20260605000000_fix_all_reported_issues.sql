-- ==============================================================================
-- BULLETPROOF RLS REPAIR: WORKSPACES, TASKS, USER_MASTER
-- ==============================================================================

-- 0. FORCE ENABLE RLS ON ALL TABLES (In case it was accidentally disabled)
ALTER TABLE public.user_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 1. PURGE ALL EXISTING POLICIES TO PREVENT "OR" BYPASSES
-- ------------------------------------------------------------------------------
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_master' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_master;', pol.policyname);
    END LOOP;

    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'workspaces' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.workspaces;', pol.policyname);
    END LOOP;

    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'tasks' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.tasks;', pol.policyname);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 2. REBUILD USER_MASTER POLICIES (STRICT SCOPING)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_master_strict_select" ON public.user_master;
DROP POLICY IF EXISTS "user_master_strict_select" ON public.user_master;
CREATE POLICY "user_master_strict_select" ON public.user_master FOR SELECT TO authenticated
USING (
  id = auth.uid() OR
  public.is_super_admin() OR
  EXISTS (
    SELECT 1 FROM public.workspace_members wm1
    JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid() AND wm2.user_id = user_master.id
    AND wm1.is_deleted = false AND wm2.is_deleted = false
  )
);

DROP POLICY IF EXISTS "user_master_super_admin_update" ON public.user_master;
DROP POLICY IF EXISTS "user_master_super_admin_update" ON public.user_master;
CREATE POLICY "user_master_super_admin_update" ON public.user_master FOR UPDATE TO authenticated
USING (public.is_super_admin() OR id = auth.uid());

-- ------------------------------------------------------------------------------
-- 3. REBUILD WORKSPACES POLICIES (STRICT SCOPING)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "workspaces_strict_select" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_strict_select" ON public.workspaces;
CREATE POLICY "workspaces_strict_select" ON public.workspaces FOR SELECT TO authenticated
USING (
  public.is_super_admin() OR
  workspace_owner_id = auth.uid() OR
  EXISTS (
      SELECT 1 FROM public.workspace_members wm 
      WHERE wm.workspace_id = workspaces.id AND wm.user_id = auth.uid() AND wm.is_deleted = false
  )
);

DROP POLICY IF EXISTS "workspaces_strict_insert" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_strict_insert" ON public.workspaces;
CREATE POLICY "workspaces_strict_insert" ON public.workspaces FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "workspaces_strict_update" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_strict_update" ON public.workspaces;
CREATE POLICY "workspaces_strict_update" ON public.workspaces FOR UPDATE TO authenticated
USING (
  public.is_super_admin() OR
  workspace_owner_id = auth.uid() OR
  EXISTS (
      SELECT 1 FROM public.workspace_members wm 
      WHERE wm.workspace_id = workspaces.id AND wm.user_id = auth.uid() AND wm.role IN ('WORKSPACE_OWNER', 'WORKSPACE_MANAGER') AND wm.is_deleted = false
  )
);

DROP POLICY IF EXISTS "workspaces_strict_delete" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_strict_delete" ON public.workspaces;
CREATE POLICY "workspaces_strict_delete" ON public.workspaces FOR DELETE TO authenticated
USING (public.is_super_admin() OR workspace_owner_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 4. REBUILD TASKS POLICIES (OWNERS + EXECUTION TEAM + WORKSPACE PEERS)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "tasks_strict_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_strict_select" ON public.tasks;
CREATE POLICY "tasks_strict_select" ON public.tasks FOR SELECT TO authenticated
USING (
  public.is_super_admin() OR
  owner_id = auth.uid() OR
  assigned_to = auth.uid() OR
  EXISTS (SELECT 1 FROM public.task_participants tp WHERE tp.task_id = tasks.id AND tp.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = tasks.workspace_id AND wm.user_id = auth.uid() AND wm.is_deleted = false)
);

DROP POLICY IF EXISTS "tasks_strict_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_strict_insert" ON public.tasks;
CREATE POLICY "tasks_strict_insert" ON public.tasks FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin() OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = workspace_id AND wm.user_id = auth.uid() AND wm.is_deleted = false)
);

DROP POLICY IF EXISTS "tasks_strict_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_strict_update" ON public.tasks;
CREATE POLICY "tasks_strict_update" ON public.tasks FOR UPDATE TO authenticated
USING (
  public.is_super_admin() OR
  owner_id = auth.uid() OR
  assigned_to = auth.uid() OR
  EXISTS (SELECT 1 FROM public.task_participants tp WHERE tp.task_id = tasks.id AND tp.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = tasks.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('WORKSPACE_OWNER', 'WORKSPACE_MANAGER') AND wm.is_deleted = false)
);

DROP POLICY IF EXISTS "tasks_strict_delete" ON public.tasks;
DROP POLICY IF EXISTS "tasks_strict_delete" ON public.tasks;
CREATE POLICY "tasks_strict_delete" ON public.tasks FOR DELETE TO authenticated
USING (
  public.is_super_admin() OR
  owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = tasks.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('WORKSPACE_OWNER', 'WORKSPACE_MANAGER') AND wm.is_deleted = false)
);
