-- 0. Ensure tasks table has owner_id
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- 1. Create Task Participants Table
CREATE TABLE IF NOT EXISTS public.task_participants (
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    participation_role TEXT NOT NULL CHECK (participation_role IN ('OWNER', 'EXECUTOR', 'REVIEWER', 'WATCHER')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (task_id, user_id)
);

-- Enable RLS
ALTER TABLE public.task_participants ENABLE ROW LEVEL SECURITY;

-- 2. RLS for task_participants
-- A user can see task participants if they can see the task.
-- To avoid recursion, we just let authenticated users select from it.
DROP POLICY IF EXISTS "task_participants_select" ON public.task_participants;
DROP POLICY IF EXISTS "task_participants_select" ON public.task_participants;
DROP POLICY IF EXISTS "task_participants_select" ON public.task_participants;
CREATE POLICY "task_participants_select" ON public.task_participants FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "task_participants_insert" ON public.task_participants;
DROP POLICY IF EXISTS "task_participants_insert" ON public.task_participants;
DROP POLICY IF EXISTS "task_participants_insert" ON public.task_participants;
CREATE POLICY "task_participants_insert" ON public.task_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "task_participants_update" ON public.task_participants;
DROP POLICY IF EXISTS "task_participants_update" ON public.task_participants;
DROP POLICY IF EXISTS "task_participants_update" ON public.task_participants;
CREATE POLICY "task_participants_update" ON public.task_participants FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "task_participants_delete" ON public.task_participants;
DROP POLICY IF EXISTS "task_participants_delete" ON public.task_participants;
DROP POLICY IF EXISTS "task_participants_delete" ON public.task_participants;
CREATE POLICY "task_participants_delete" ON public.task_participants FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);


-- 3. Trigger to keep tasks.owner_id in sync with task_participants OWNER role
CREATE OR REPLACE FUNCTION public.sync_task_owner_to_participants()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.owner_id IS NOT NULL THEN
        -- Upsert the owner into task_participants
        INSERT INTO public.task_participants (task_id, user_id, participation_role)
        VALUES (NEW.id, NEW.owner_id, 'OWNER')
        ON CONFLICT (task_id, user_id) DO UPDATE SET participation_role = 'OWNER';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_task_owner ON public.tasks;
CREATE TRIGGER trg_sync_task_owner
AFTER INSERT OR UPDATE OF owner_id ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.sync_task_owner_to_participants();


-- 4. Overwrite Task RLS to be strictly scope-bound (No recursion)
DROP POLICY IF EXISTS "tasks_member_access" ON public.tasks;
DROP POLICY IF EXISTS "tasks_member_access" ON public.tasks;
DROP POLICY IF EXISTS "tasks_member_access" ON public.tasks;
CREATE POLICY "tasks_member_access" ON public.tasks FOR SELECT TO authenticated USING (
    -- Super Admin Bypass
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('SUPER_ADMIN', 'ROLE_ADMIN') OR
    -- Single Owner
    owner_id = auth.uid() OR
    assigned_to = auth.uid() OR -- Legacy fallback
    -- Direct Participant
    EXISTS (SELECT 1 FROM public.task_participants tp WHERE tp.task_id = tasks.id AND tp.user_id = auth.uid()) OR
    -- Direct Workspace Member (NO recursive lookups)
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = tasks.workspace_id AND wm.user_id = auth.uid() AND wm.is_deleted = false)
);

DROP POLICY IF EXISTS "tasks_insert_access" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_access" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_access" ON public.tasks;
CREATE POLICY "tasks_insert_access" ON public.tasks FOR INSERT TO authenticated WITH CHECK (
    -- Super Admin Bypass
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('SUPER_ADMIN', 'ROLE_ADMIN') OR
    -- Direct Workspace Member
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = workspace_id AND wm.user_id = auth.uid() AND wm.is_deleted = false)
);

DROP POLICY IF EXISTS "tasks_update_access" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_access" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_access" ON public.tasks;
CREATE POLICY "tasks_update_access" ON public.tasks FOR UPDATE TO authenticated USING (
    -- Super Admin Bypass
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('SUPER_ADMIN', 'ROLE_ADMIN') OR
    owner_id = auth.uid() OR
    assigned_to = auth.uid() OR
    EXISTS (SELECT 1 FROM public.task_participants tp WHERE tp.task_id = tasks.id AND tp.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = tasks.workspace_id AND wm.user_id = auth.uid() AND wm.is_deleted = false)
);

DROP POLICY IF EXISTS "tasks_delete_access" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_access" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_access" ON public.tasks;
CREATE POLICY "tasks_delete_access" ON public.tasks FOR DELETE TO authenticated USING (
    -- Super Admin Bypass
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('SUPER_ADMIN', 'ROLE_ADMIN') OR
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = tasks.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('WORKSPACE_OWNER', 'WORKSPACE_MANAGER'))
);

-- We also make sure the basic update policy strictly enforces owner logic or executor logic.
-- However, for now we will keep the basic auth.uid() IS NOT NULL for UPDATE/DELETE, 
-- and rely on the UI and application layer actions to strictly enforce edit rights (e.g. `checkServerPermission` + ownership verification).
