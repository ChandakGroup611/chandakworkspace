-- Drawing Approval, Drawing Register Tracker & Design Coordination Workflow
-- Additive migration: Masters, Tracker, Task Generations, Append-Only Audit Logs, Email Templates & Rules

-- 1. Master: Schedule Intervals (Next Check / Next Creation)
CREATE TABLE IF NOT EXISTS public.drawing_schedule_intervals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  interval_type TEXT NOT NULL CHECK (interval_type IN ('WEEKLY', 'MONTHLY', 'CUSTOM')),
  interval_days INT NOT NULL DEFAULT 7 CHECK (interval_days >= 0),
  description TEXT,
  sort_order INT NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.drawing_schedule_intervals (code, name, interval_type, interval_days, description, sort_order)
VALUES
  ('WEEKLY', 'Weekly', 'WEEKLY', 7, 'Every 7 calendar days from task creation', 1),
  ('MONTHLY', 'Monthly', 'MONTHLY', 30, 'Every calendar month (month-end safe) from task creation', 2),
  ('CUSTOM', 'Custom', 'CUSTOM', 1, 'Custom date or day interval configured per drawing', 3)
ON CONFLICT (code) DO NOTHING;

-- 2. Master: Drawing Coordination Statuses (mapped to TASK status_master)
CREATE TABLE IF NOT EXISTS public.drawing_coordination_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  task_status_code TEXT NOT NULL DEFAULT 'WORK INPROGRESS',
  color TEXT NOT NULL DEFAULT '#3B82F6',
  is_terminal BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.drawing_coordination_statuses (code, name, task_status_code, color, is_terminal, sort_order)
VALUES
  ('DRAWING_SUBMITTED', 'Drawing Submitted', 'NEW', '#64748B', false, 1),
  ('AWAITING_APPROVAL', 'Awaiting Approval', 'TO DO', '#F59E0B', false, 2),
  ('APPROVED', 'Approved', 'WORK INPROGRESS', '#10B981', false, 3),
  ('AWAITING_DRAWING_RECEIPT', 'Awaiting Drawing Receipt', 'TO DO', '#3B82F6', false, 4),
  ('DRAWING_RECEIVED', 'Drawing Received', 'WORK INPROGRESS', '#0EA5E9', false, 5),
  ('DESIGN_RECEIVED', 'Design Received', 'WORK INPROGRESS', '#6366F1', false, 6),
  ('UNDER_REVIEW', 'Under Review', 'NEED TO CHECK', '#8B5CF6', false, 7),
  ('RETURNED_FOR_REVISION', 'Returned for Revision', 'FOLLOW UP', '#EF4444', false, 8),
  ('REVISION_IN_PROGRESS', 'Revision in Progress', 'WORK INPROGRESS', '#F97316', false, 9),
  ('REVISED_DRAWING_SUBMITTED', 'Revised Drawing Submitted', 'REPLIED', '#14B8A6', false, 10),
  ('AWAITING_RE_RECEIPT', 'Awaiting Re-Receipt', 'TO DO', '#3B82F6', false, 11),
  ('AWAITING_FINAL_ACCEPTANCE', 'Awaiting Final Acceptance', 'NEED TO CHECK', '#10B981', false, 12),
  ('DRAWING_COORDINATION_COMPLETED', 'Drawing Coordination Completed', 'CLOSED', '#059669', true, 13),
  ('CLOSED', 'Closed', 'CLOSED', '#475569', true, 14)
ON CONFLICT (code) DO NOTHING;

-- 3. Master: Review Outcomes
CREATE TABLE IF NOT EXISTS public.drawing_review_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  target_coordination_status TEXT NOT NULL,
  requires_comment BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.drawing_review_outcomes (code, name, target_coordination_status, requires_comment, sort_order)
VALUES
  ('ACCEPT', 'Accept / No Changes Required', 'DRAWING_COORDINATION_COMPLETED', false, 1),
  ('RETURN_FOR_REVISION', 'Return to Design Team for Changes', 'RETURNED_FOR_REVISION', true, 2),
  ('PENDING_MORE_INFO', 'Pending Review / More Information Required', 'UNDER_REVIEW', true, 3)
ON CONFLICT (code) DO NOTHING;

-- 4. Master: SLA Statuses
CREATE TABLE IF NOT EXISTS public.drawing_sla_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#10B981',
  sort_order INT NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.drawing_sla_statuses (code, name, color, sort_order)
VALUES
  ('WITHIN_SLA', 'Within SLA', '#10B981', 1),
  ('DUE_SOON', 'Due Soon', '#F59E0B', 2),
  ('OVERDUE', 'Overdue', '#F97316', 3),
  ('SLA_BREACHED', 'SLA Breached', '#EF4444', 4),
  ('RESOLVED', 'Resolved', '#64748B', 5)
ON CONFLICT (code) DO NOTHING;

-- 5. Drawing Coordination Tracker (one continuous record per approved drawing)
CREATE TABLE IF NOT EXISTS public.drawing_coordination_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id UUID NOT NULL UNIQUE REFERENCES public.dmac_drawings(id) ON DELETE CASCADE,
  drawing_number TEXT NOT NULL,
  reference_number TEXT,
  drawing_title TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES public.dmac_projects(id) ON DELETE CASCADE,
  sub_package TEXT,
  department_id UUID NOT NULL REFERENCES public.dmac_departments(id),
  current_rev_no INT NOT NULL DEFAULT 0,
  approval_status TEXT NOT NULL DEFAULT 'APPROVED',
  approval_step_id UUID,
  approved_file_id UUID,
  approved_at TIMESTAMPTZ,
  approved_by UUID,

  -- Linked Task Management record
  active_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  task_created_at TIMESTAMPTZ,
  task_sync_status TEXT NOT NULL DEFAULT 'SYNCED' CHECK (task_sync_status IN ('SYNCED', 'PENDING', 'FAILED')),
  task_sync_error TEXT,

  -- Departmental handover & ownership
  design_owner_id UUID,
  receiving_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  current_responsible_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  current_responsible_user_id UUID,
  coordination_status_code TEXT NOT NULL DEFAULT 'AWAITING_DRAWING_RECEIPT',
  pending_action TEXT,

  -- Handover / receipt / review timestamps
  last_handover_at TIMESTAMPTZ,
  last_received_at TIMESTAMPTZ,
  last_received_by UUID,
  last_received_rev_no INT,
  design_received_at TIMESTAMPTZ,
  design_received_by UUID,
  design_received_rev_no INT,
  last_returned_at TIMESTAMPTZ,
  last_returned_by UUID,
  last_return_reason TEXT,

  -- Next Check & Next Creation schedules (kept separate)
  next_check_interval_code TEXT NOT NULL DEFAULT 'WEEKLY',
  next_check_custom_days INT,
  next_check_at TIMESTAMPTZ,
  next_creation_interval_code TEXT NOT NULL DEFAULT 'MONTHLY',
  next_creation_custom_days INT,
  next_creation_at TIMESTAMPTZ,

  -- SLA monitoring
  sla_status_code TEXT NOT NULL DEFAULT 'WITHIN_SLA',
  sla_due_at TIMESTAMPTZ,
  sla_breached_at TIMESTAMPTZ,
  sla_last_notified_at TIMESTAMPTZ,

  -- Formal closure
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMPTZ,
  closed_by UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dct_project ON public.drawing_coordination_tracker (project_id);
CREATE INDEX IF NOT EXISTS idx_dct_active_next_creation ON public.drawing_coordination_tracker (next_creation_at) WHERE is_closed = false;
CREATE INDEX IF NOT EXISTS idx_dct_active_sla ON public.drawing_coordination_tracker (sla_due_at) WHERE is_closed = false;
CREATE INDEX IF NOT EXISTS idx_dct_task ON public.drawing_coordination_tracker (active_task_id);

-- 6. Task Generation History (prevents duplicate scheduled tasks & preserves chain)
CREATE TABLE IF NOT EXISTS public.drawing_task_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id UUID NOT NULL REFERENCES public.drawing_coordination_tracker(id) ON DELETE CASCADE,
  generation_no INT NOT NULL,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  previous_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  scheduled_for TIMESTAMPTZ,
  rev_no INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tracker_id, generation_no),
  UNIQUE (tracker_id, task_id)
);

-- 7. Append-Only Coordination Audit Trail
CREATE TABLE IF NOT EXISTS public.drawing_coordination_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id UUID NOT NULL REFERENCES public.drawing_coordination_tracker(id) ON DELETE CASCADE,
  drawing_id UUID NOT NULL,
  drawing_number TEXT NOT NULL,
  rev_no INT NOT NULL DEFAULT 0,
  task_id UUID,
  previous_status TEXT,
  new_status TEXT,
  action TEXT NOT NULL,
  actor_id UUID,
  actor_email TEXT,
  actor_department_id UUID,
  previous_responsible_department_id UUID,
  new_responsible_department_id UUID,
  previous_responsible_user_id UUID,
  new_responsible_user_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dcal_tracker ON public.drawing_coordination_audit_logs (tracker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dcal_drawing ON public.drawing_coordination_audit_logs (drawing_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.trg_enforce_drawing_coord_audit_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Drawing coordination audit logs are strictly append-only.';
END $$;

DROP TRIGGER IF EXISTS trg_drawing_coord_audit_immutable ON public.drawing_coordination_audit_logs;
CREATE TRIGGER trg_drawing_coord_audit_immutable
  BEFORE UPDATE OR DELETE ON public.drawing_coordination_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_drawing_coord_audit_immutability();

-- 8. RLS & service_role-only security
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'drawing_schedule_intervals',
    'drawing_coordination_statuses',
    'drawing_review_outcomes',
    'drawing_sla_statuses',
    'drawing_coordination_tracker',
    'drawing_task_generations',
    'drawing_coordination_audit_logs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
  END LOOP;
END $$;

REVOKE TRUNCATE ON TABLE public.drawing_coordination_audit_logs FROM service_role;

-- 9. Seed Email Templates & Notification Rules for Design Coordination Events (if absent)
INSERT INTO public.email_templates (module, event, template_name, subject, html_body, is_active)
SELECT v.module, v.event, v.template_name, v.subject, v.html_body, true
FROM (VALUES
  ('Design', 'Drawing Coordination Started', 'Drawing Coordination Started', 'Drawing Approved & Task Created: {{drawing_number}} ({{revision}})', '<p>Drawing <strong>{{drawing_number}}</strong> ({{drawing_title}}) for <strong>{{project_name}}</strong> has been approved and a Drawing Submission task has been created.</p><p><strong>Responsible Department:</strong> {{responsible_department}}<br/><strong>Next Check:</strong> {{next_check_date}}</p><p><a href="{{link}}">Open Drawing Tracker</a></p>'),
  ('Design', 'Drawing Handed Over', 'Drawing Handed Over', 'Drawing Handed Over: {{drawing_number}} ({{revision}})', '<p>Drawing <strong>{{drawing_number}}</strong> ({{drawing_title}}) has been handed over to <strong>{{responsible_department}}</strong>. Please confirm Drawing Received.</p><p><a href="{{link}}">Confirm Receipt</a></p>'),
  ('Design', 'Drawing Receipt Confirmed', 'Drawing Receipt Confirmed', 'Drawing Received: {{drawing_number}} ({{revision}})', '<p><strong>{{actor_name}}</strong> confirmed receipt of drawing <strong>{{drawing_number}}</strong> ({{revision}}) for <strong>{{responsible_department}}</strong>.</p><p><a href="{{link}}">View Tracker</a></p>'),
  ('Design', 'Design Received', 'Design Received for Review', 'Design Received for Review: {{drawing_number}} ({{revision}})', '<p><strong>{{actor_name}}</strong> confirmed Design Received and started review for <strong>{{drawing_number}}</strong> ({{revision}}).</p><p><a href="{{link}}">View Tracker</a></p>'),
  ('Design', 'Drawing Returned for Revision', 'Drawing Returned for Revision', 'Revision Required: {{drawing_number}} ({{revision}})', '<p>Drawing <strong>{{drawing_number}}</strong> ({{drawing_title}}) was returned for revision.</p><p><strong>Reason:</strong> {{remarks}}</p><p><a href="{{link}}">Upload Revised Drawing</a></p>'),
  ('Design', 'Revised Drawing Resubmitted', 'Revised Drawing Resubmitted', 'Revised Drawing Submitted: {{drawing_number}} ({{revision}})', '<p>A revised drawing <strong>{{drawing_number}}</strong> ({{revision}}) has been submitted on the active coordination task. Please confirm re-receipt.</p><p><a href="{{link}}">Open Drawing Tracker</a></p>'),
  ('Design', 'Drawing Coordination Completed', 'Drawing Coordination Completed', 'Drawing Coordination Completed: {{drawing_number}} ({{revision}})', '<p>Drawing <strong>{{drawing_number}}</strong> ({{drawing_title}}) has been accepted and coordination is completed.</p><p><a href="{{link}}">View Tracker</a></p>'),
  ('Design', 'Drawing Next Check Due', 'Drawing Next Check Due', 'Next Check Due: {{drawing_number}} ({{revision}})', '<p>Scheduled Next Check is due for drawing <strong>{{drawing_number}}</strong> ({{drawing_title}}).</p><p><strong>Status:</strong> {{coordination_status}}<br/><strong>SLA Status:</strong> {{sla_status}}</p><p><a href="{{link}}">Open Drawing Tracker</a></p>'),
  ('Design', 'Drawing Next Task Created', 'Drawing Next Task Created', 'Follow-Up Task Created: {{drawing_number}} ({{revision}})', '<p>A scheduled follow-up task has been automatically created for active drawing <strong>{{drawing_number}}</strong> ({{drawing_title}}).</p><p><a href="{{link}}">Open Drawing Tracker</a></p>'),
  ('Design', 'Drawing SLA Breached', 'Drawing SLA Breached', 'SLA Breached: {{drawing_number}} ({{revision}})', '<p>SLA has breached for drawing <strong>{{drawing_number}}</strong> ({{drawing_title}}).</p><p><strong>Responsible Department:</strong> {{responsible_department}}<br/><strong>SLA Due Date:</strong> {{sla_due_date}}</p><p><a href="{{link}}">Open Drawing Tracker</a></p>')
) AS v(module, event, template_name, subject, html_body)
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates et
  WHERE et.module = v.module AND et.event = v.event
);

INSERT INTO public.notification_rules (module, event, status_trigger, recipient_type, delivery_method, is_active)
SELECT v.module, v.event, NULL, v.recipient_type::jsonb, '["email","in_app"]'::jsonb, true
FROM (VALUES
  ('Design', 'Drawing Coordination Started', '["Designer","Reviewers"]'),
  ('Design', 'Drawing Handed Over', '["Reviewers"]'),
  ('Design', 'Drawing Receipt Confirmed', '["Designer"]'),
  ('Design', 'Design Received', '["Designer"]'),
  ('Design', 'Drawing Returned for Revision', '["Designer"]'),
  ('Design', 'Revised Drawing Resubmitted', '["Reviewers"]'),
  ('Design', 'Drawing Coordination Completed', '["Designer","Reviewers"]'),
  ('Design', 'Drawing Next Check Due', '["Designer","Reviewers"]'),
  ('Design', 'Drawing Next Task Created', '["Designer","Reviewers"]'),
  ('Design', 'Drawing SLA Breached', '["Designer","Reviewers","Escalation"]')
) AS v(module, event, recipient_type)
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_rules nr
  WHERE nr.module = v.module AND nr.event = v.event
);
