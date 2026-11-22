-- ============================================================================
-- Migration: 20261122150000_rollout_standard_roles.sql
-- Description: Phase 7 - Rollout Canonical STANDARD Role Across Remaining Modules
-- Governance: Master Architecture Blueprint v2.0
-- ============================================================================

-- 1. TASK_WORKFLOW: Insert/Update STANDARD Role
INSERT INTO module_roles (
  module_code, role_code, name, description, permissions, is_system, policy_version, is_customized, created_at
)
VALUES (
  'TASK_WORKFLOW',
  'STANDARD',
  'Workspace Member',
  'Standard operational member who can create and update tasks, log comments, and resolve tickets.',
  ARRAY[
    'WORKSPACES_VIEW',
    'TASKS_VIEW',
    'TASKS_CREATE',
    'TASKS_UPDATE_CORE',
    'TASKS_CHECKLIST',
    'TASKS_COMMENT',
    'TICKETS_VIEW',
    'TICKETS_CREATE',
    'REQUIREMENTS_VIEW'
  ]::text[],
  true,
  1,
  false,
  NOW()
)
ON CONFLICT (module_code, role_code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_system = true;

-- 2. VEHICLE_DESK: Insert/Update STANDARD Role
INSERT INTO module_roles (
  module_code, role_code, name, description, permissions, is_system, policy_version, is_customized, created_at
)
VALUES (
  'VEHICLE_DESK',
  'STANDARD',
  'Vehicle Requester',
  'Standard employee who can view fleet status and raise trip requests.',
  ARRAY['VEHICLES_VIEW', 'TRIPS_VIEW', 'TRIPS_REQUEST']::text[],
  true,
  1,
  false,
  NOW()
)
ON CONFLICT (module_code, role_code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_system = true;

-- 3. DESIGN_TRACKING: Insert/Update STANDARD Role
INSERT INTO module_roles (
  module_code, role_code, name, description, permissions, is_system, policy_version, is_customized, created_at
)
VALUES (
  'DESIGN_TRACKING',
  'STANDARD',
  'Design Contributor',
  'Standard design team member who uploads drawings, views registers, and raises RFIs.',
  ARRAY['DESIGN_PROJECTS_VIEW', 'DRAWINGS_VIEW', 'DRAWINGS_UPLOAD', 'RFIS_VIEW', 'RFIS_RAISE']::text[],
  true,
  1,
  false,
  NOW()
)
ON CONFLICT (module_code, role_code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_system = true;

-- 4. ORG_BUDGET: Insert/Update STANDARD Role
INSERT INTO module_roles (
  module_code, role_code, name, description, permissions, is_system, policy_version, is_customized, created_at
)
VALUES (
  'ORG_BUDGET',
  'STANDARD',
  'Budget Viewer / Analyst',
  'Standard user who can view approved project budgets and export reports.',
  ARRAY['BUDGET_VIEW', 'BUDGET_REPORTS_EXPORT']::text[],
  true,
  1,
  false,
  NOW()
)
ON CONFLICT (module_code, role_code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_system = true;

-- 5. DASHBOARDS: Insert/Update STANDARD Role
INSERT INTO module_roles (
  module_code, role_code, name, description, permissions, is_system, policy_version, is_customized, created_at
)
VALUES (
  'DASHBOARDS',
  'STANDARD',
  'Dashboard Viewer',
  'Standard dashboard viewer with access to summary KPIs and drilldowns.',
  ARRAY['VIEW', 'DETAILS']::text[],
  true,
  1,
  false,
  NOW()
)
ON CONFLICT (module_code, role_code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_system = true;

-- 6. AMC: Insert/Update STANDARD and AMC_ADMIN Roles
INSERT INTO module_roles (
  module_code, role_code, name, description, permissions, is_system, policy_version, is_customized, created_at
)
VALUES 
(
  'AMC',
  'STANDARD',
  'AMC Member',
  'Standard team member who can view active maintenance contracts and warranty coverage.',
  ARRAY['AMC_VIEW']::text[],
  true,
  1,
  false,
  NOW()
),
(
  'AMC',
  'AMC_ADMIN',
  'AMC Administrator',
  'Full administrative control to create, renew, and terminate maintenance contracts.',
  ARRAY['AMC_VIEW', 'AMC_MANAGE']::text[],
  false,
  1,
  false,
  NOW()
)
ON CONFLICT (module_code, role_code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_system = EXCLUDED.is_system;

-- 7. Migrate existing user assignments in user_module_access to STANDARD
-- TASK_WORKFLOW: MEMBER -> STANDARD
UPDATE user_module_access
SET role_code = 'STANDARD'
WHERE module_code = 'TASK_WORKFLOW' AND role_code = 'MEMBER';

-- VEHICLE_DESK: REQUESTER -> STANDARD
UPDATE user_module_access
SET role_code = 'STANDARD'
WHERE module_code = 'VEHICLE_DESK' AND role_code = 'REQUESTER';

-- DESIGN_TRACKING: CONTRIBUTOR -> STANDARD
UPDATE user_module_access
SET role_code = 'STANDARD'
WHERE module_code = 'DESIGN_TRACKING' AND role_code = 'CONTRIBUTOR';

-- DASHBOARDS: VIEWER -> STANDARD
UPDATE user_module_access
SET role_code = 'STANDARD'
WHERE module_code = 'DASHBOARDS' AND role_code = 'VIEWER';

-- 8. Record audit log
INSERT INTO rbac_sync_audit_logs (
  module_code,
  previous_version,
  new_version,
  added_permissions,
  modified_roles,
  sync_status,
  details,
  executed_by
)
VALUES (
  'ALL_MODULES',
  1,
  2,
  '{}'::text[],
  ARRAY['STANDARD']::text[],
  'SUCCESS',
  '{"action": "ROLLOUT_STANDARD_ROLES", "modules": ["TASK_WORKFLOW", "VEHICLE_DESK", "DESIGN_TRACKING", "ORG_BUDGET", "DASHBOARDS", "AMC"]}'::jsonb,
  'system:phase7_rollout'
);
