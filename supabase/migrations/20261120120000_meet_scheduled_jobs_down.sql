DROP INDEX IF EXISTS public.uq_meet_sla_instances_open_item;
DROP INDEX IF EXISTS public.idx_meet_sessions_reminder_due;

ALTER TABLE public.meet_sessions
  DROP COLUMN IF EXISTS reminder_1h_sent_at,
  DROP COLUMN IF EXISTS reminder_24h_sent_at;
