-- Chandak Meet scheduled jobs (/api/cron/meet-jobs)
-- Reminder dedupe stamps so each session reminder is sent exactly once,
-- and a guard so one overdue item has at most one open SLA instance.

ALTER TABLE public.meet_sessions
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_meet_sessions_reminder_due
  ON public.meet_sessions (scheduled_start)
  WHERE status = 'scheduled' AND is_deleted = false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_meet_sla_instances_open_item
  ON public.meet_sla_instances (item_type, item_id)
  WHERE state <> 'met';
