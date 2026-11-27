-- ============================================================================
-- Release 3: Operational Control
-- 1. SLA Pause/Resume on drawing_coordination_tracker + drawing_sla_pause_logs
-- 2. Live Drawing Transmittal & Handover extensions on dmac_transmittals / items
-- 3. Notification rules seed for Transmittals & SLA
-- 4. RLS hardening for new/extended tables
-- ============================================================================

-- 1. SLA Pause/Resume columns on drawing_coordination_tracker
ALTER TABLE public.drawing_coordination_tracker
  ADD COLUMN IF NOT EXISTS sla_paused BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sla_paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_pause_reason TEXT,
  ADD COLUMN IF NOT EXISTS sla_paused_by UUID,
  ADD COLUMN IF NOT EXISTS sla_total_paused_minutes INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_dct_sla_paused
  ON public.drawing_coordination_tracker (sla_paused)
  WHERE is_closed = false;

-- Append-only SLA Pause/Resume audit log
CREATE TABLE IF NOT EXISTS public.drawing_sla_pause_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id UUID NOT NULL REFERENCES public.drawing_coordination_tracker(id) ON DELETE CASCADE,
  drawing_id UUID NOT NULL REFERENCES public.dmac_drawings(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('PAUSE', 'RESUME')),
  reason TEXT NOT NULL,
  paused_at TIMESTAMPTZ NOT NULL,
  resumed_at TIMESTAMPTZ,
  paused_minutes INT NOT NULL DEFAULT 0,
  previous_sla_due_at TIMESTAMPTZ,
  new_sla_due_at TIMESTAMPTZ,
  actor_id UUID,
  actor_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dmac_sla_pause_logs_tracker
  ON public.drawing_sla_pause_logs (tracker_id, created_at DESC);

ALTER TABLE public.drawing_sla_pause_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.drawing_sla_pause_logs FROM anon, authenticated;
GRANT ALL ON public.drawing_sla_pause_logs TO service_role;

-- 2. Live Drawing Transmittal & Handover extensions
ALTER TABLE public.dmac_transmittals
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS recipient_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purpose VARCHAR(50) NOT NULL DEFAULT 'FOR_REVIEW',
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'ISSUED'
    CHECK (status IN ('ISSUED', 'ACKNOWLEDGED', 'RETURNED', 'CANCELLED')),
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_by UUID,
  ADD COLUMN IF NOT EXISTS acknowledged_by_email TEXT,
  ADD COLUMN IF NOT EXISTS acknowledgment_notes TEXT,
  ADD COLUMN IF NOT EXISTS copies_count INT NOT NULL DEFAULT 1;

ALTER TABLE public.dmac_transmittal_items
  ADD COLUMN IF NOT EXISTS drawing_id UUID REFERENCES public.dmac_drawings(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS rev_no INT,
  ADD COLUMN IF NOT EXISTS tracker_id UUID REFERENCES public.drawing_coordination_tracker(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dmac_transmittals_project
  ON public.dmac_transmittals (project_id, issued_at DESC);

CREATE INDEX IF NOT EXISTS idx_dmac_transmittal_items_transmittal
  ON public.dmac_transmittal_items (transmittal_id);

-- Ensure service_role RLS on dmac_holiday_calendar, dmac_transmittals, dmac_transmittal_items
ALTER TABLE public.dmac_holiday_calendar ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dmac_holiday_calendar FROM anon, authenticated;
GRANT ALL ON public.dmac_holiday_calendar TO service_role;

ALTER TABLE public.dmac_transmittals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dmac_transmittals FROM anon, authenticated;
GRANT ALL ON public.dmac_transmittals TO service_role;

ALTER TABLE public.dmac_transmittal_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dmac_transmittal_items FROM anon, authenticated;
GRANT ALL ON public.dmac_transmittal_items TO service_role;

-- 3. Seed notification rules for Release 3 events
INSERT INTO public.notification_rules (module, event, status_trigger, recipient_type, delivery_method, is_active)
SELECT v.module, v.event, 'ANY', v.recipients::jsonb, '["EMAIL", "IN_APP"]'::jsonb, true
FROM (VALUES
  ('Design', 'Drawing SLA Breached',            '["Reviewers", "Escalation"]'),
  ('Design', 'Drawing SLA Due Soon',            '["Reviewers"]'),
  ('Design', 'Drawing Transmittal Issued',      '["Designer", "Reviewers"]'),
  ('Design', 'Drawing Transmittal Acknowledged','["Designer"]')
) AS v(module, event, recipients)
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_rules r
  WHERE lower(r.module) = lower(v.module) AND lower(r.event) = lower(v.event)
);
