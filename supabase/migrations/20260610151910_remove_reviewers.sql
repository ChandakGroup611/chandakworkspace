-- Remove all existing reviewers
DELETE FROM "public"."task_participants" WHERE "participation_role" = 'REVIEWER';

-- Drop the existing constraint
ALTER TABLE "public"."task_participants" DROP CONSTRAINT IF EXISTS "task_participants_participation_role_check";

-- Add the new constraint without REVIEWER
ALTER TABLE "public"."task_participants" 
ADD CONSTRAINT "task_participants_participation_role_check" 
CHECK (("participation_role" = ANY (ARRAY['OWNER'::"text", 'EXECUTOR'::"text", 'WATCHER'::"text"])));
