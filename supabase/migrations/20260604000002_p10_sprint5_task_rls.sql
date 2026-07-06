-- Sprint 5: Phase 5 - Task Ownership and Permissions Model
-- This script applies strict Row Level Security to the tasks table without breaking existing functionality.

-- Enable RLS on Tasks if not already enabled
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 1. Drop existing policies to prevent conflicts and ensure clean application
DROP POLICY IF EXISTS "Super Admin Full Access to Tasks" ON public.tasks;
DROP POLICY IF EXISTS "Task Owner Full Access" ON public.tasks;
DROP POLICY IF EXISTS "Execution Team View Access" ON public.tasks;

-- 2. Super Admin Access: Full Control
DROP POLICY IF EXISTS "Super Admin Full Access to Tasks" ON public.tasks;
DROP POLICY IF EXISTS "Super Admin Full Access to Tasks" ON public.tasks;
CREATE POLICY "Super Admin Full Access to Tasks" ON public.tasks 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_master 
    WHERE id = auth.uid() 
    AND role_id = (SELECT id FROM public.roles WHERE code = 'SUPER_ADMIN' LIMIT 1)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_master 
    WHERE id = auth.uid() 
    AND role_id = (SELECT id FROM public.roles WHERE code = 'SUPER_ADMIN' LIMIT 1)
  )
);

-- 3. Task Owner Access: Full Control (Edit, Delete, Status Change, Reassign)
DROP POLICY IF EXISTS "Task Owner Full Access" ON public.tasks;
DROP POLICY IF EXISTS "Task Owner Full Access" ON public.tasks;
CREATE POLICY "Task Owner Full Access" ON public.tasks 
FOR ALL 
TO authenticated 
USING (
  owner_id = auth.uid() OR created_by = auth.uid()
)
WITH CHECK (
  owner_id = auth.uid() OR created_by = auth.uid()
);

-- 4. Execution Team Access: View Only (Comments, Attachments, Remarks handled in their own tables)
DROP POLICY IF EXISTS "Execution Team View Access" ON public.tasks;
DROP POLICY IF EXISTS "Execution Team View Access" ON public.tasks;
CREATE POLICY "Execution Team View Access" ON public.tasks 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.task_participants 
    WHERE task_id = tasks.id 
    AND user_id = auth.uid()
  )
);

-- 5. Task Comments RLS (Allow Execution Team and Owners to add comments)
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Task Participants Can Add Comments" ON public.task_comments;
DROP POLICY IF EXISTS "Task Owners Can Add Comments" ON public.task_comments;
DROP POLICY IF EXISTS "Super Admin Can Add Comments" ON public.task_comments;

DROP POLICY IF EXISTS "Task Participants Can Add Comments" ON public.task_comments;
DROP POLICY IF EXISTS "Task Participants Can Add Comments" ON public.task_comments;
CREATE POLICY "Task Participants Can Add Comments" ON public.task_comments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.task_participants
    WHERE task_id = task_comments.task_id
    AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Task Owners Can Add Comments" ON public.task_comments;
DROP POLICY IF EXISTS "Task Owners Can Add Comments" ON public.task_comments;
CREATE POLICY "Task Owners Can Add Comments" ON public.task_comments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = task_comments.task_id
    AND (owner_id = auth.uid() OR created_by = auth.uid())
  )
);

DROP POLICY IF EXISTS "Super Admin Can Add Comments" ON public.task_comments;
DROP POLICY IF EXISTS "Super Admin Can Add Comments" ON public.task_comments;
CREATE POLICY "Super Admin Can Add Comments" ON public.task_comments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_master 
    WHERE id = auth.uid() 
    AND role_id = (SELECT id FROM public.roles WHERE code = 'SUPER_ADMIN' LIMIT 1)
  )
);

-- Note: The UI layer correctly disables Edit/Delete buttons if the user is only an Execution Team member.
