-- ==============================================================================
-- DMAC step 2: notifications for the drawing review loop, SLA escalation, digest
--
-- Uses the company notification engine (notification_rules + email_templates +
-- email_queue + notification_queue). Recipients are resolved by the app for each
-- event (module "Design"), so a rule's recipient_type lists roles:
--   Reviewers     people who can review/approve drawings on the project
--   Designer      who submitted the revision, plus the drawing's design owner
--   Escalation    the escalation contacts configured for the project/department
-- Admins can change the wording in Settings > Communication (email_templates).
-- ==============================================================================

INSERT INTO public.notification_rules (module, event, status_trigger, recipient_type, delivery_method, is_active)
SELECT v.module, v.event, 'ANY', v.recipients::jsonb, '["EMAIL", "IN_APP"]'::jsonb, true
FROM (VALUES
    ('Design', 'Drawing Submitted',  '["Reviewers"]'),
    ('Design', 'Drawing Approved',   '["Designer"]'),
    ('Design', 'Drawing Returned',   '["Designer"]'),
    ('Design', 'GFC Released',       '["Designer", "Reviewers"]'),
    ('Design', 'Review Overdue',     '["Reviewers", "Escalation"]'),
    ('Design', 'Revision Overdue',   '["Designer", "Escalation"]'),
    ('Design', 'Daily Digest',       '["Digest Recipient"]')
) AS v(module, event, recipients)
WHERE NOT EXISTS (
    SELECT 1 FROM public.notification_rules r
    WHERE lower(r.module) = lower(v.module) AND lower(r.event) = lower(v.event)
);

-- One escalation per drawing per working day, however often the job runs
ALTER TABLE public.dmac_drawings ADD COLUMN IF NOT EXISTS last_escalated_on DATE;

-- Escalation contacts: one row per project (or per project x department)
CREATE UNIQUE INDEX IF NOT EXISTS uq_dmac_sla_rule_scope
    ON public.dmac_sla_escalation_rules (coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
                                        coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid),
                                        escalate_to_user_id);

ALTER TABLE public.dmac_sla_escalation_rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dmac_sla_escalation_rules FROM anon, authenticated;
GRANT ALL ON public.dmac_sla_escalation_rules TO service_role;
