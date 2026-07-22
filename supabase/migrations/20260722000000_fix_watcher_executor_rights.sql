-- Migration to fix task update access for Watchers and Executors

-- 1. Create a function specifically for checking update access
CREATE OR REPLACE FUNCTION "public"."check_task_update_access"("target_task_id" "uuid", "target_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Super admin check
  IF public.is_super_admin() THEN
    RETURN true;
  END IF;

  -- Check if user is owner or creator on the task itself
  IF EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = target_task_id
    AND (owner_id = target_user_id OR created_by = target_user_id)
  ) THEN
    RETURN true;
  END IF;

  -- Check if user is a participant with an update-capable role (Exclude WATCHER)
  IF EXISTS (
    SELECT 1 FROM public.task_participants
    WHERE task_id = target_task_id
    AND user_id = target_user_id
    AND participation_role IN ('OWNER', 'EXECUTOR', 'REVIEWER')
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

ALTER FUNCTION "public"."check_task_update_access"("target_task_id" "uuid", "target_user_id" "uuid") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."check_task_update_access"("target_task_id" "uuid", "target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_task_update_access"("target_task_id" "uuid", "target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_task_update_access"("target_task_id" "uuid", "target_user_id" "uuid") TO "service_role";

-- 2. Drop existing overly permissive policies
DROP POLICY IF EXISTS "tasks_strict_update" ON "public"."tasks";

DROP POLICY IF EXISTS "task_participants_insert" ON "public"."task_participants";
DROP POLICY IF EXISTS "task_participants_update" ON "public"."task_participants";
DROP POLICY IF EXISTS "task_participants_delete" ON "public"."task_participants";

-- 3. Recreate task update policy using the new function
CREATE POLICY "tasks_strict_update" ON "public"."tasks" FOR UPDATE TO "authenticated" USING ("public"."check_task_update_access"("id", "auth"."uid"()));

-- 4. Recreate task_participants policies to prevent unauthorized modification
-- Allow insert/update/delete if the user has update access to the task
CREATE POLICY "task_participants_insert" ON "public"."task_participants" FOR INSERT TO "authenticated" WITH CHECK ("public"."check_task_update_access"("task_id", "auth"."uid"()));
CREATE POLICY "task_participants_update" ON "public"."task_participants" FOR UPDATE TO "authenticated" USING ("public"."check_task_update_access"("task_id", "auth"."uid"()));
CREATE POLICY "task_participants_delete" ON "public"."task_participants" FOR DELETE TO "authenticated" USING ("public"."check_task_update_access"("task_id", "auth"."uid"()));

-- Also ensure task_comments policies are intact (already confirmed they are correct)
