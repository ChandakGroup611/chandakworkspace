-- Down Migration: 20261119120000_wp4_reliability_and_concurrency_down.sql
-- Reverses WP4 Reliability and Concurrency changes

BEGIN;

DROP FUNCTION IF EXISTS public.claim_email_queue_batch(INT);

DROP TABLE IF EXISTS public.sla_holidays CASCADE;

DROP INDEX IF EXISTS public.idx_email_queue_claim;

-- Restore email_queue from backup if needed
-- TRUNCATE TABLE public.email_queue;
-- INSERT INTO public.email_queue (id, recipient_email, subject, body_template, is_sent, sent_at, created_at)
-- SELECT id, recipient_email, subject, body_template, is_sent, sent_at, created_at FROM public.backup_email_queue_20261119;

COMMIT;
