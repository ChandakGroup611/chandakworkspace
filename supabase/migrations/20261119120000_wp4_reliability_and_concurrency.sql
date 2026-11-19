-- Migration: 20261119120000_wp4_reliability_and_concurrency.sql
-- Master Programme WP4: Reliability, Concurrency & Data Volume
-- Backup table: backup_email_queue_20261119

BEGIN;

-- 1. Backup existing email_queue data
CREATE TABLE IF NOT EXISTS public.backup_email_queue_20261119 AS
SELECT * FROM public.email_queue;

-- 2. Add columns to email_queue for retry backoff, locking, and status
ALTER TABLE public.email_queue
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS error_message TEXT,
    ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS html_body TEXT,
    ADD COLUMN IF NOT EXISTS module VARCHAR(50),
    ADD COLUMN IF NOT EXISTS event VARCHAR(50),
    ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES public.user_master(id),
    ADD COLUMN IF NOT EXISTS provider_used UUID REFERENCES public.email_providers(id);

-- 3. Backfill status for existing rows
UPDATE public.email_queue
SET status = CASE WHEN is_sent = true THEN 'COMPLETED' ELSE 'PENDING' END
WHERE status IS NULL OR status = 'PENDING';

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_email_queue_claim
    ON public.email_queue(is_sent, status, next_retry_at, attempts, created_at);

-- 5. Atomic email claim function with SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_email_queue_batch(p_batch_size INT DEFAULT 10)
RETURNS SETOF public.email_queue
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH claimable AS (
    SELECT id
    FROM public.email_queue
    WHERE is_sent = false
      AND (status IS NULL OR status IN ('PENDING', 'FAILED', 'RETRY'))
      AND (next_retry_at IS NULL OR next_retry_at <= now())
      AND (COALESCE(attempts, 0) < 5)
    ORDER BY created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.email_queue q
  SET status = 'PROCESSING',
      processed_at = now()
  FROM claimable
  WHERE q.id = claimable.id
  RETURNING q.*;
END;
$$;

-- 6. Table sla_holidays for Indian corporate work calendar (Mon-Sat, skipping Sundays & holidays)
CREATE TABLE IF NOT EXISTS public.sla_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_date DATE NOT NULL UNIQUE,
    holiday_name VARCHAR(100) NOT NULL,
    region VARCHAR(50) DEFAULT 'Global',
    is_recurring BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed essential statutory holidays for 2026-2027 if empty
INSERT INTO public.sla_holidays (holiday_date, holiday_name, region) VALUES
    ('2026-01-01', 'New Year''s Day', 'Global'),
    ('2026-01-26', 'Republic Day', 'India'),
    ('2026-03-03', 'Holi', 'India'),
    ('2026-04-14', 'Dr. Ambedkar Jayanti', 'India'),
    ('2026-05-01', 'Maharashtra Day', 'Maharashtra'),
    ('2026-08-15', 'Independence Day', 'India'),
    ('2026-09-14', 'Ganesh Chaturthi', 'Maharashtra'),
    ('2026-10-02', 'Mahatma Gandhi Jayanti', 'India'),
    ('2026-10-20', 'Dussehra', 'India'),
    ('2026-11-08', 'Diwali (Lakshmi Pujan)', 'India'),
    ('2026-11-09', 'Diwali (Balipratipada)', 'India'),
    ('2026-12-25', 'Christmas Day', 'Global'),
    ('2027-01-01', 'New Year''s Day', 'Global'),
    ('2027-01-26', 'Republic Day', 'India')
ON CONFLICT (holiday_date) DO NOTHING;

-- RLS on sla_holidays
ALTER TABLE public.sla_holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_sla_holidays_select ON public.sla_holidays;
CREATE POLICY policy_sla_holidays_select ON public.sla_holidays
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS policy_sla_holidays_manage ON public.sla_holidays;
CREATE POLICY policy_sla_holidays_manage ON public.sla_holidays
    FOR ALL TO authenticated USING (public.is_super_admin() OR public.check_user_permission('SYSTEM_SETTINGS_MANAGE'));

COMMIT;
