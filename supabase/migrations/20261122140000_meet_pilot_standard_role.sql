-- ============================================================================
-- Migration: Chandak Meet Pilot - STANDARD Role & User Access Migration
-- Governance: Master Architecture Blueprint v2.0 (Phase 4 Pilot)
-- Description:
--   1. Inserts canonical 'STANDARD' role into module_roles for CHANDAK_MEET.
--   2. Preserves existing PARTICIPANT permissions (MEETINGS_VIEW, AGENDA_ADD_POINTS, ACTION_ITEMS_UPDATE).
--   3. Migrates all 14 active PARTICIPANT assignments in user_module_access to STANDARD.
--   4. Records migration execution in rbac_sync_audit_logs.
-- ============================================================================

-- 1. Insert/Update STANDARD role in module_roles
INSERT INTO module_roles (
  module_code,
  role_code,
  name,
  description,
  permissions,
  is_system,
  policy_version,
  is_customized,
  created_at
)
VALUES (
  'CHANDAK_MEET',
  'STANDARD',
  'Meeting Participant',
  'Standard meeting participant who can view meetings, add agenda points, and update assigned action items.',
  ARRAY['MEETINGS_VIEW', 'AGENDA_ADD_POINTS', 'ACTION_ITEMS_UPDATE']::text[],
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
  is_system = true,
  policy_version = COALESCE(module_roles.policy_version, 1);

-- 2. Migrate existing user assignments from PARTICIPANT to STANDARD in user_module_access
UPDATE user_module_access
SET role_code = 'STANDARD'
WHERE module_code = 'CHANDAK_MEET' AND role_code = 'PARTICIPANT';

-- 3. Log audit event in rbac_sync_audit_logs
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
  'CHANDAK_MEET',
  0,
  1,
  '{}'::text[],
  ARRAY['STANDARD']::text[],
  'SUCCESS',
  '{"migrated_role": "PARTICIPANT -> STANDARD", "standard_permissions": ["MEETINGS_VIEW", "AGENDA_ADD_POINTS", "ACTION_ITEMS_UPDATE"], "users_migrated": 14}'::jsonb,
  'system:pilot_migration'
);
