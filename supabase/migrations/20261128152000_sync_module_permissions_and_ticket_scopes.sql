-- ============================================================================
-- Sync Missing Module Permissions (Organization Budget & DMS) and Ticket Scopes
-- ============================================================================

-- 1. Seed Organization Budget & DMS permissions into public.permissions (idempotent)
INSERT INTO public.permissions (code, name, module, action, submodule, resource_type, display_group)
SELECT v.code, v.name, v.module, v.action, v.submodule, 'PAGE', v.display_group
FROM (VALUES
  -- Organization Budget (matching lib/modules/manifests/budget.manifest.ts)
  ('BUDGET_VIEW',           'View Budgets',                 'Organization Budget', 'VIEW',      'Budgets',           'Organization Budget'),
  ('BUDGET_PROJECT_MANAGE', 'Manage Budget Projects',       'Organization Budget', 'MANAGE',    'Projects & Towers', 'Organization Budget'),
  ('COST_HEADS_MANAGE',     'Manage Cost Heads',            'Organization Budget', 'CONFIGURE', 'Cost Heads',        'Organization Budget'),
  ('BUDGET_PREPARE',        'Prepare Budgets',              'Organization Budget', 'CREATE',    'Budgets',           'Organization Budget'),
  ('BUDGET_DEPT_EDIT',      'Edit Department Budgets',      'Organization Budget', 'UPDATE',    'Budgets',           'Organization Budget'),
  ('BUDGET_SUBMIT',         'Submit Budgets',               'Organization Budget', 'APPROVE',   'Budgets',           'Organization Budget'),
  ('BUDGET_APPROVE',        'Approve Budgets',              'Organization Budget', 'APPROVE',   'Budgets',           'Organization Budget'),
  ('INCURRED_MANAGE',       'Manage Incurred Actuals',      'Organization Budget', 'UPDATE',    'Actuals',           'Organization Budget'),
  ('BUDGET_REPORTS_EXPORT', 'Export Budget Reports',        'Organization Budget', 'EXPORT',    'Reports',           'Organization Budget'),
  ('BUDGET_SETTINGS',       'Manage Budget Settings',       'Organization Budget', 'CONFIGURE', 'Settings',          'Organization Budget'),

  -- DMS (Design Tracking submodule)
  ('DMS_VIEW',              'View DMS Folders & Documents', 'Design Tracking',     'VIEW',      'DMS',               'Design Tracking'),
  ('DMS_UPLOAD',            'Upload & Split DMS Documents', 'Design Tracking',     'CREATE',    'DMS',               'Design Tracking'),
  ('DMS_QC_APPROVE',        'Approve & Reject DMS QC',      'Design Tracking',     'APPROVE',   'DMS',               'Design Tracking'),
  ('DMS_SHARES_MANAGE',     'Manage External DMS Shares',   'Design Tracking',     'MANAGE',    'DMS',               'Design Tracking'),
  ('DMS_MASTERS_MANAGE',    'Manage DMS Masters & Groups',  'Design Tracking',     'CONFIGURE', 'DMS',               'Design Tracking'),
  ('DMS_SETTINGS',          'Manage DMS Settings & Bin',    'Design Tracking',     'CONFIGURE', 'DMS',               'Design Tracking')
) AS v(code, name, module, action, submodule, display_group)
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions p WHERE p.code = v.code
);

-- 2. Seed missing module Ticket Scopes into public.ticket_scopes (idempotent)
INSERT INTO public.ticket_scopes (code, name, description)
SELECT v.code, v.name, v.description
FROM (VALUES
  ('DESIGN',  'Design & Drawing Tracking', 'Drawing register, GFC approvals, DMS, RFIs, and transmittals.'),
  ('BUDGET',  'Organization Budget',       'Project budgets, cost heads, schedules, bills, and approvals.'),
  ('VEHICLE', 'Fleet & Vehicles',          'Vehicle desk, insurance, PUC, maintenance, and driver allocations.'),
  ('AMC',     'AMC & Facilities',          'Annual maintenance contracts, service schedules, and vendor SLAs.'),
  ('MEET',    'Chandak Meet',              'Meetings, minutes of meeting, and action items.')
) AS v(code, name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ticket_scopes ts WHERE ts.code = v.code
);

-- 3. Map standard ticket master keys to the new module scopes
INSERT INTO public.scope_master_mapping (scope_id, master_key, is_required)
SELECT ts.id, mk.master_key, false
FROM public.ticket_scopes ts
CROSS JOIN (VALUES
  ('master_priority'),
  ('ticket_category'),
  ('ticket_subcategory'),
  ('workflow_state')
) AS mk(master_key)
WHERE ts.code IN ('DESIGN', 'BUDGET', 'VEHICLE', 'AMC', 'MEET')
  AND NOT EXISTS (
    SELECT 1 FROM public.scope_master_mapping smm
    WHERE smm.scope_id = ts.id AND smm.master_key = mk.master_key
  );
