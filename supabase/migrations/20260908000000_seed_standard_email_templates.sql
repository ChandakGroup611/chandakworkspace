-- ============================================================================
-- ADIOS PLATFORM MIGRATION: SEED STANDARD DYNAMIC EMAIL TEMPLATES & RULES
-- ============================================================================

-- 1. SEED EMAIL TEMPLATES
-- ----------------------------------------------------------------------------
INSERT INTO public.email_templates (module, event, template_name, subject, html_body, is_active)
VALUES
  -- WORKSPACE MODULE
  (
    'Workspace',
    'Assigned',
    'Workspace Enrolled',
    'Assigned to Workspace: {{workspace_name}}',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700;">Workspace Assignment</h2>
  <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">You have been enrolled as a member in the workspace below:</p>
  <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Workspace:</strong> {{workspace_name}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Code:</strong> {{workspace_code}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Assigned By:</strong> {{creator_name}}</p>
  </div>
  <div style="margin-top: 24px;">
    <a href="{{link}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">View Workspace</a>
  </div>
</div>',
    true
  ),
  (
    'Workspace',
    'Updated',
    'Workspace Updated',
    'Workspace Updated: {{workspace_name}}',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700;">Workspace Updated</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Workspace:</strong> {{workspace_name}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Code:</strong> {{workspace_code}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Updated By:</strong> {{creator_name}}</p>
  </div>
  <div style="margin-top: 24px;">
    <a href="{{link}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">View Workspace</a>
  </div>
</div>',
    true
  ),

  -- TICKET MODULE
  (
    'Ticket',
    'Created',
    'New Ticket Created',
    'New Ticket Created: #{{ticket_no}} - {{ticket_title}}',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700;">New Ticket Created</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Ticket #:</strong> {{ticket_no}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Title:</strong> {{ticket_title}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Priority:</strong> {{priority}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Created By:</strong> {{creator_name}}</p>
  </div>
  <div style="margin-top: 24px;">
    <a href="{{link}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">View Ticket</a>
  </div>
</div>',
    true
  ),
  (
    'Ticket',
    'Assigned',
    'Ticket Assigned',
    'Ticket Assigned: #{{ticket_no}} - {{ticket_title}}',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700;">Ticket Assigned to You</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Ticket #:</strong> {{ticket_no}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Title:</strong> {{ticket_title}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Status:</strong> {{status}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Priority:</strong> {{priority}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Assigned By:</strong> {{creator_name}}</p>
  </div>
  <div style="margin-top: 24px;">
    <a href="{{link}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">View Ticket</a>
  </div>
</div>',
    true
  ),
  (
    'Ticket',
    'Status Changed',
    'Ticket Status Changed',
    'Ticket Status Updated: #{{ticket_no}} ({{status}})',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700;">Ticket Status Updated</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Ticket #:</strong> {{ticket_no}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Title:</strong> {{ticket_title}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">New Status:</strong> {{status}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Updated By:</strong> {{creator_name}}</p>
  </div>
  <div style="margin-top: 24px;">
    <a href="{{link}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">View Ticket</a>
  </div>
</div>',
    true
  ),

  -- REQUIREMENT MODULE
  (
    'Requirement',
    'Approval Requested',
    'Requirement Approval Requested',
    'Action Required: Approval for {{req_name}} ({{req_code}})',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700;">Requirement Approval Pending</h2>
  <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">A requirement is awaiting your review and approval:</p>
  <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Requirement #:</strong> {{req_code}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Title:</strong> {{req_name}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Status:</strong> {{status}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Requested By:</strong> {{creator_name}}</p>
  </div>
  <div style="margin-top: 24px;">
    <a href="{{link}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Review & Approve</a>
  </div>
</div>',
    true
  ),
  (
    'Requirement',
    'Sign-Off Requested',
    'Requirement Sign-Off Requested',
    'Action Required: Sign-Off for {{req_name}} ({{req_code}})',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700;">Requirement Sign-Off Pending</h2>
  <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">This requirement has completed approvals and is awaiting your final sign-off:</p>
  <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Requirement #:</strong> {{req_code}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Title:</strong> {{req_name}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Submitted By:</strong> {{creator_name}}</p>
  </div>
  <div style="margin-top: 24px;">
    <a href="{{link}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Review & Sign-Off</a>
  </div>
</div>',
    true
  ),
  (
    'Requirement',
    'Approved',
    'Requirement Approved',
    'Requirement Approved: {{req_name}} ({{req_code}})',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700;">Requirement Approved</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #16a34a; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Requirement #:</strong> {{req_code}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Title:</strong> {{req_name}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Status:</strong> Approved</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Approved By:</strong> {{creator_name}}</p>
  </div>
  <div style="margin-top: 24px;">
    <a href="{{link}}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">View Requirement</a>
  </div>
</div>',
    true
  ),
  (
    'Requirement',
    'Signed Off',
    'Requirement Signed Off',
    'Requirement Signed Off: {{req_name}} ({{req_code}})',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700;">Requirement Signed Off</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #16a34a; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Requirement #:</strong> {{req_code}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Title:</strong> {{req_name}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Status:</strong> Signed Off</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Signed Off By:</strong> {{creator_name}}</p>
  </div>
  <div style="margin-top: 24px;">
    <a href="{{link}}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">View Requirement</a>
  </div>
</div>',
    true
  ),
  (
    'Requirement',
    'Amended',
    'Requirement Revised',
    'Requirement Revised: {{req_name}} ({{req_code}})',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700;">Requirement Revised</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Requirement #:</strong> {{req_code}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Title:</strong> {{req_name}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Revised By:</strong> {{creator_name}}</p>
  </div>
  <div style="margin-top: 24px;">
    <a href="{{link}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">View Details</a>
  </div>
</div>',
    true
  ),

  -- TASK MODULE (Additional events)
  (
    'Task',
    'Status Changed',
    'Task Status Changed',
    'Task Status Changed: {{task_name}} ({{status}})',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700;">Task Status Updated</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Task:</strong> {{task_name}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">New Status:</strong> {{status}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Updated By:</strong> {{creator_name}}</p>
  </div>
  <div style="margin-top: 24px;">
    <a href="{{link}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">View Task</a>
  </div>
</div>',
    true
  ),
  (
    'Task',
    'Completed',
    'Task Completed',
    'Task Completed: {{task_name}}',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 700;">Task Completed</h2>
  <div style="background-color: #f8fafc; border-left: 4px solid #16a34a; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Task:</strong> {{task_name}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Status:</strong> Completed</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong style="color: #0f172a;">Completed By:</strong> {{creator_name}}</p>
  </div>
  <div style="margin-top: 24px;">
    <a href="{{link}}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">View Task</a>
  </div>
</div>',
    true
  )
ON CONFLICT (module, event) DO UPDATE SET
  template_name = EXCLUDED.template_name,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  is_active = true,
  updated_at = timezone('utc'::text, now());

-- 2. SEED NOTIFICATION RULES
-- ----------------------------------------------------------------------------
INSERT INTO public.notification_rules (module, event, status_trigger, recipient_type, delivery_method, is_active)
VALUES
  ('Workspace', 'Assigned', 'ANY', '["Assigned User"]'::jsonb, '["EMAIL"]'::jsonb, true),
  ('Workspace', 'Updated', 'ANY', '["Assigned User", "Workspace Owner"]'::jsonb, '["EMAIL"]'::jsonb, true),
  ('Ticket', 'Created', 'ANY', '["Creator", "Department Admin", "Assigned User"]'::jsonb, '["EMAIL"]'::jsonb, true),
  ('Ticket', 'Assigned', 'ANY', '["Assigned User", "Creator"]'::jsonb, '["EMAIL"]'::jsonb, true),
  ('Ticket', 'Status Changed', 'ANY', '["Creator", "Assigned User", "Watchers"]'::jsonb, '["EMAIL"]'::jsonb, true),
  ('Requirement', 'Approval Requested', 'ANY', '["Specific Approver", "Approver"]'::jsonb, '["EMAIL"]'::jsonb, true),
  ('Requirement', 'Sign-Off Requested', 'ANY', '["Specific Approver", "Approver"]'::jsonb, '["EMAIL"]'::jsonb, true),
  ('Requirement', 'Approved', 'ANY', '["Requester", "Creator"]'::jsonb, '["EMAIL"]'::jsonb, true),
  ('Requirement', 'Signed Off', 'ANY', '["Requester", "Creator"]'::jsonb, '["EMAIL"]'::jsonb, true),
  ('Requirement', 'Amended', 'ANY', '["Assigned User", "Executors"]'::jsonb, '["EMAIL"]'::jsonb, true),
  ('Task', 'Status Changed', 'ANY', '["Creator", "Assigned User", "Executors"]'::jsonb, '["EMAIL"]'::jsonb, true),
  ('Task', 'Completed', 'ANY', '["Creator", "Workspace Owner"]'::jsonb, '["EMAIL"]'::jsonb, true)
ON CONFLICT DO NOTHING;
