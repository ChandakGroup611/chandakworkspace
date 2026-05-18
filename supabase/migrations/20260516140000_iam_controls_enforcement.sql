-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Advanced IAM Controls & Dynamic Access Governance
-- Purpose: Implements SAP/ServiceNow grade RBAC with hierarchical triggers.
-- ============================================================================

-- 1. Table Refinements
-- ----------------------------------------------------------------------------

-- Enhance Roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- Enhance Permissions
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS submodule TEXT;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS resource_type TEXT DEFAULT 'PAGE'; -- 'PAGE', 'ACTION', 'API'
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS display_group TEXT;

-- 2. Security Policy Enablement
-- ----------------------------------------------------------------------------

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_roles_all ON roles;
CREATE POLICY policy_roles_all ON roles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_permissions_all ON permissions;
CREATE POLICY policy_permissions_all ON permissions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_role_permissions_all ON role_permissions;
CREATE POLICY policy_role_permissions_all ON role_permissions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_user_roles_all ON user_roles;
CREATE POLICY policy_user_roles_all ON user_roles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE user_permissions_snapshot ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_ups_all ON user_permissions_snapshot;
CREATE POLICY policy_ups_all ON user_permissions_snapshot FOR SELECT USING (true);


-- 3. High-Performance Permission Snapshot Synchronization Engine
-- ----------------------------------------------------------------------------

-- Trigger function for direct User -> Role assignment changes
CREATE OR REPLACE FUNCTION refresh_user_permissions_snapshot_on_user_role()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_permissions_snapshot (user_id, permissions, updated_at)
    SELECT 
        ur.user_id,
        array_agg(DISTINCT p.code) as permissions,
        now()
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = COALESCE(NEW.user_id, OLD.user_id)
    GROUP BY ur.user_id
    ON CONFLICT (user_id) DO UPDATE SET
        permissions = EXCLUDED.permissions,
        updated_at = now();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for Role -> Permission mapping changes (Affects all users with that role)
CREATE OR REPLACE FUNCTION refresh_user_permissions_snapshot_on_role_perm()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_permissions_snapshot (user_id, permissions, updated_at)
    SELECT 
        ur.user_id,
        array_agg(DISTINCT p.code) as permissions,
        now()
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.role_id = COALESCE(NEW.role_id, OLD.role_id)
    GROUP BY ur.user_id
    ON CONFLICT (user_id) DO UPDATE SET
        permissions = EXCLUDED.permissions,
        updated_at = now();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to ensure snapshot is always fresh
DROP TRIGGER IF EXISTS tr_refresh_ups_on_user_role ON user_roles;
CREATE TRIGGER tr_refresh_ups_on_user_role
    AFTER INSERT OR UPDATE OR DELETE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION refresh_user_permissions_snapshot_on_user_role();

DROP TRIGGER IF EXISTS tr_refresh_ups_on_role_perm ON role_permissions;
CREATE TRIGGER tr_refresh_ups_on_role_perm
    AFTER INSERT OR UPDATE OR DELETE ON role_permissions
    FOR EACH ROW EXECUTE FUNCTION refresh_user_permissions_snapshot_on_role_perm();


-- 4. Foundational Data & System Roles Seeding
-- ----------------------------------------------------------------------------

-- Seed System Master Roles
INSERT INTO roles (code, name, description, is_system, is_active) VALUES
    ('SUPER_ADMIN', 'Super Administrator', 'Immutable system owner with absolute operational authority.', true, true),
    ('ROLE_ADMIN', 'Security Administrator', 'Governance lead managing roles, permissions, and audit trails.', false, true),
    ('ROLE_MANAGER', 'Departmental Lead', 'Operational manager with approval and oversight capabilities.', false, true),
    ('ROLE_STAFF', 'Service Professional', 'Standard user with execution-level access to core modules.', false, true)
ON CONFLICT (code) DO UPDATE SET is_system = EXCLUDED.is_system;

-- Seed Granular Permissions Matrix
INSERT INTO permissions (code, name, module, submodule, action, resource_type) VALUES
    -- IAM Module
    ('IAM_VIEW', 'View Identity Controls', 'IAM', 'Security Registry', 'VIEW', 'PAGE'),
    ('IAM_MANAGE', 'Manage Roles & Access', 'IAM', 'Security Registry', 'MANAGE', 'PAGE'),
    
    -- Tickets Module
    ('TICKETS_VIEW', 'View Operations Tickets', 'Tickets', 'ITSM Lifecycle', 'VIEW', 'PAGE'),
    ('TICKETS_CREATE', 'Create Service Tickets', 'Tickets', 'ITSM Lifecycle', 'CREATE', 'ACTION'),
    ('TICKETS_UPDATE', 'Modify Ticket Records', 'Tickets', 'ITSM Lifecycle', 'UPDATE', 'ACTION'),
    ('TICKETS_DELETE', 'Purge Ticket Data', 'Tickets', 'ITSM Lifecycle', 'DELETE', 'ACTION'),
    ('TICKETS_MANAGE', 'Full Ticket Governance', 'Tickets', 'ITSM Lifecycle', 'MANAGE', 'PAGE'),
    
    -- Workspaces Module
    ('WORKSPACES_VIEW', 'View Workspace Hub', 'Workspaces', 'Execution Tasks', 'VIEW', 'PAGE'),
    ('WORKSPACES_CREATE', 'Initialize Workspaces', 'Workspaces', 'Execution Tasks', 'CREATE', 'ACTION'),
    ('WORKSPACES_MANAGE', 'Workspace Governance', 'Workspaces', 'Execution Tasks', 'MANAGE', 'PAGE')
ON CONFLICT (code) DO NOTHING;

-- Map ALL permissions to SUPER_ADMIN and ROLE_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
ON CONFLICT DO NOTHING;

-- Map basic permissions to ROLE_STAFF
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.code = 'ROLE_STAFF' AND p.code IN ('TICKETS_VIEW', 'TICKETS_CREATE', 'WORKSPACES_VIEW')
ON CONFLICT DO NOTHING;


-- 5. Bootstrap Identity Assignment
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    v_user_id UUID;
    v_role_id UUID;
BEGIN
    -- Assign USR-EXEC-001 to SUPER_ADMIN
    SELECT id INTO v_user_id FROM user_master WHERE user_code = 'USR-EXEC-001' LIMIT 1;
    SELECT id INTO v_role_id FROM roles WHERE code = 'SUPER_ADMIN' LIMIT 1;
    
    IF v_user_id IS NOT NULL AND v_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id) VALUES (v_user_id, v_role_id) ON CONFLICT DO NOTHING;
        
        -- Force initial snapshot refresh for bootstrap user
        INSERT INTO user_permissions_snapshot (user_id, permissions, updated_at)
        SELECT 
            ur.user_id,
            array_agg(DISTINCT p.code) as permissions,
            now()
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = v_user_id
        GROUP BY ur.user_id
        ON CONFLICT (user_id) DO UPDATE SET
            permissions = EXCLUDED.permissions,
            updated_at = now();
    END IF;
END $$;
