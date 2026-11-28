-- ============================================================================
-- Global User Deactivation Metadata & Historical Reference Retention Guard
-- ============================================================================

-- 1. Deactivation & reactivation audit metadata on public.user_master
ALTER TABLE public.user_master
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivated_by UUID,
  ADD COLUMN IF NOT EXISTS deactivation_reason TEXT,
  ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reactivated_by UUID;

CREATE INDEX IF NOT EXISTS idx_user_master_active_not_deleted
  ON public.user_master (is_active, is_deleted);

-- 2. Prevent hard DELETE on public.user_master when historical records exist
CREATE OR REPLACE FUNCTION public.fn_user_master_prevent_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_history BOOLEAN := false;
BEGIN
  SELECT (
    EXISTS (SELECT 1 FROM public.tasks WHERE created_by = OLD.id OR assigned_to = OLD.id OR owner_id = OLD.id)
    OR EXISTS (SELECT 1 FROM public.task_participants WHERE user_id = OLD.id)
    OR EXISTS (SELECT 1 FROM public.task_activity_logs WHERE actor_id = OLD.id)
    OR EXISTS (SELECT 1 FROM public.tickets WHERE creator_id = OLD.id OR assignee_id = OLD.id)
    OR EXISTS (SELECT 1 FROM public.requirements WHERE requester_id = OLD.id)
    OR EXISTS (SELECT 1 FROM public.dms_documents WHERE created_by = OLD.id)
    OR EXISTS (SELECT 1 FROM public.dmac_drawings WHERE created_by = OLD.id)
    OR EXISTS (SELECT 1 FROM public.meet_meetings WHERE created_by = OLD.id OR chair_id = OLD.id)
    OR EXISTS (SELECT 1 FROM public.messenger_messages WHERE sender_id = OLD.id)
  ) INTO v_has_history;

  IF v_has_history THEN
    RAISE EXCEPTION 'Cannot hard-delete user % because historical references exist. Use soft deactivation (is_active = false).', OLD.id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_master_prevent_hard_delete ON public.user_master;
CREATE TRIGGER trg_user_master_prevent_hard_delete
  BEFORE DELETE ON public.user_master
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_user_master_prevent_hard_delete();
