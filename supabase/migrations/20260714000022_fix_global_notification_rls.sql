BEGIN;

-- Relax UPDATE policy to allow SUPER_ADMIN to modify GLOBAL_OPS notifications
DROP POLICY IF EXISTS policy_notification_queue_update ON public.notification_queue;
CREATE POLICY policy_notification_queue_update ON public.notification_queue 
FOR UPDATE 
USING (
  target_user_id = auth.uid()::text 
  OR (target_user_id = 'GLOBAL_OPS' AND public.is_super_admin())
)
WITH CHECK (
  target_user_id = auth.uid()::text 
  OR (target_user_id = 'GLOBAL_OPS' AND public.is_super_admin())
);

-- Relax DELETE policy to allow SUPER_ADMIN to delete GLOBAL_OPS notifications
DROP POLICY IF EXISTS policy_notification_queue_delete ON public.notification_queue;
CREATE POLICY policy_notification_queue_delete ON public.notification_queue 
FOR DELETE 
USING (
  target_user_id = auth.uid()::text 
  OR (target_user_id = 'GLOBAL_OPS' AND public.is_super_admin())
);

COMMIT;
