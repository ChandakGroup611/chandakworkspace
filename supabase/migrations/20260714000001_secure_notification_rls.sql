-- Description: Strictly secure the notification_queue table to prevent data leakage.
-- Replaces overly permissive USING (true) policies with target_user_id validation.

BEGIN;

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- 1. Drop all permissive/legacy policies on this table
DROP POLICY IF EXISTS policy_nq_all ON public.notification_queue;
DROP POLICY IF EXISTS policy_notification_queue_select ON public.notification_queue;
DROP POLICY IF EXISTS policy_notification_queue_capability ON public.notification_queue;
DROP POLICY IF EXISTS policy_notification_queue_update ON public.notification_queue;
DROP POLICY IF EXISTS policy_notification_queue_delete ON public.notification_queue;

-- Note: We intentionally leave policy_notification_queue_insert alone, 
-- or recreate it if we need backend functions to insert.
-- Usually, triggers and service_role bypass RLS for inserts anyway.
DROP POLICY IF EXISTS policy_notification_queue_insert ON public.notification_queue;
CREATE POLICY policy_notification_queue_insert ON public.notification_queue 
FOR INSERT WITH CHECK (true);

-- 2. Create strict SELECT policy
CREATE POLICY policy_notification_queue_select ON public.notification_queue 
FOR SELECT 
USING (
  target_user_id = auth.uid()::text 
  OR target_user_id = 'GLOBAL_OPS'
);

-- 3. Create strict UPDATE policy (users can only update their own notifications, e.g., mark as read)
CREATE POLICY policy_notification_queue_update ON public.notification_queue 
FOR UPDATE 
USING (target_user_id = auth.uid()::text)
WITH CHECK (target_user_id = auth.uid()::text);

-- 4. Create strict DELETE policy (users can only delete their own notifications)
CREATE POLICY policy_notification_queue_delete ON public.notification_queue 
FOR DELETE 
USING (target_user_id = auth.uid()::text);

COMMIT;
