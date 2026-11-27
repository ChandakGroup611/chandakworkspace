-- Release 1: Seed missing Drawing SLA Due Soon and Drawing Task Closed email templates & notification rules

INSERT INTO public.email_templates (module, event, template_name, subject, html_body, is_active)
SELECT v.module, v.event, v.template_name, v.subject, v.html_body, true
FROM (VALUES
  ('Design', 'Drawing SLA Due Soon', 'Drawing SLA Due Soon', 'SLA Due Soon: {{drawing_number}} ({{revision}})', '<p>The SLA for drawing <strong>{{drawing_number}}</strong> ({{drawing_title}}) is due soon.</p><p><strong>Responsible Department:</strong> {{responsible_department}}<br/><strong>SLA Due Date:</strong> {{sla_due_date}}</p><p><a href="{{link}}">Open Drawing Tracker</a></p>'),
  ('Design', 'Drawing Task Closed', 'Drawing Task Closed', 'Drawing Coordination Closed: {{drawing_number}} ({{revision}})', '<p>The Drawing Submission &amp; Coordination task for <strong>{{drawing_number}}</strong> ({{drawing_title}}) has been formally closed.</p><p><a href="{{link}}">View Drawing Tracker</a></p>')
) AS v(module, event, template_name, subject, html_body)
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates et
  WHERE et.module = v.module AND et.event = v.event
);

INSERT INTO public.notification_rules (module, event, status_trigger, recipient_type, delivery_method, is_active)
SELECT v.module, v.event, NULL, v.recipient_type::jsonb, '["email","in_app"]'::jsonb, true
FROM (VALUES
  ('Design', 'Drawing SLA Due Soon', '["Designer","Reviewers"]'),
  ('Design', 'Drawing Task Closed', '["Designer","Reviewers"]')
) AS v(module, event, recipient_type)
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_rules nr
  WHERE nr.module = v.module AND nr.event = v.event
);
