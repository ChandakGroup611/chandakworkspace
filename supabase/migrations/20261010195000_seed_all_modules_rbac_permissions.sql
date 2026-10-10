-- ==============================================================================
-- Migration: 20261010195000_seed_all_modules_rbac_permissions.sql
-- Description: Comprehensive RBAC integration for all newly added modules:
--              1. Design & Tracking (CAD / Matrix / Drawings / Transmittals / RFIs)
--              2. Learning Hub & System Architecture Playbooks
--              3. Vehicle Desk & Fleet Logistics
--              4. AMC & Vendor Contracts
--              5. Requirements Planning & Approvals
--              6. SLA Monitoring & Breaches
-- ==============================================================================

-- 1. Ensure modules_master contains all platform modules
CREATE TABLE IF NOT EXISTS modules_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'Layers',
    route_path TEXT NOT NULL,
    display_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO modules_master (code, name, description, icon, route_path, display_order, is_active) VALUES
    ('TASK_WORKFLOW', 'Task & Workspace Management', 'Core Operations, Workspace Trees, Tasks & Ticketing', 'FolderKanban', '/', 1, true),
    ('VEHICLE_DESK', 'Vehicle Management Desk', 'Fleet, Drivers, Trips & Maintenance Logistics', 'Car', '/vehicle', 2, true),
    ('DESIGN_TRACKING', 'Design & Drawing Tracking', 'Architecture, Matrix, Drawing Registers & Approvals', 'Compass', '/design/matrix', 3, true),
    ('DASHBOARDS', 'Executive Dashboards', 'Department budget, live metrics & analytics', 'LineChart', '/dashboards', 4, true),
    ('LEARNING_HUB', 'Enterprise Learning Hub', 'System Architecture, Module Connections & Playbooks', 'BookOpen', '/learning', 5, true),
    ('AMC_CONTRACTS', 'AMC & Vendor Subscriptions', 'Annual Maintenance Contracts & Equipment Warranties', 'ShieldCheck', '/amc', 6, true)
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    route_path = EXCLUDED.route_path,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 2. Seed Granular Permissions for All Modules into permissions table
INSERT INTO permissions (code, name, module, submodule, action, resource_type) VALUES
    -- ==========================================
    -- 1. Design & Tracking Module Permissions
    -- ==========================================
    ('DESIGN_VIEW', 'View Design Matrix & CAD Hub', 'Design Tracking', 'Drawing Matrix', 'VIEW', 'PAGE'),
    ('DESIGN_CREATE', 'Upload Drawings & Draft RFIs', 'Design Tracking', 'Drawing Register', 'CREATE', 'ACTION'),
    ('DESIGN_UPDATE', 'Modify Matrix & Drawing Details', 'Design Tracking', 'Drawing Register', 'UPDATE', 'ACTION'),
    ('DESIGN_APPROVE', 'Approve Good-for-Construction (GFC)', 'Design Tracking', 'GFC Governance', 'APPROVE', 'ACTION'),
    ('DESIGN_DELETE', 'Purge Design Records & Drawings', 'Design Tracking', 'Drawing Register', 'DELETE', 'ACTION'),
    ('DESIGN_EXPORT', 'Export Matrix & Transmittal Slips', 'Design Tracking', 'Reports', 'EXPORT', 'ACTION'),
    ('DESIGN_MANAGE', 'Full Design Master Governance', 'Design Tracking', 'Design Masters', 'MANAGE', 'PAGE'),
    ('DESIGN_MASTERS_MANAGE', 'Manage Disciplines, Packages & Consultants', 'Design Tracking', 'Design Masters', 'MANAGE', 'ACTION'),

    -- ==========================================
    -- 2. Learning Hub & Knowledge Platform
    -- ==========================================
    ('LEARNING_VIEW', 'View Learning Hub & Architecture', 'Learning Hub', 'Knowledge Base', 'VIEW', 'PAGE'),
    ('LEARNING_CREATE', 'Create Training Modules & Guides', 'Learning Hub', 'Knowledge Base', 'CREATE', 'ACTION'),
    ('LEARNING_UPDATE', 'Modify CRUD Guides & Dictionaries', 'Learning Hub', 'Knowledge Base', 'UPDATE', 'ACTION'),
    ('LEARNING_DELETE', 'Remove Training Modules', 'Learning Hub', 'Knowledge Base', 'DELETE', 'ACTION'),
    ('LEARNING_MANAGE', 'Full Learning Platform Governance', 'Learning Hub', 'Knowledge Base', 'MANAGE', 'PAGE'),
    ('LEARNING_EXPORT', 'Export Flowcharts & Schemas', 'Learning Hub', 'Reports', 'EXPORT', 'ACTION'),

    -- ==========================================
    -- 3. Vehicle Desk & Fleet Management
    -- ==========================================
    ('VEHICLE_VIEW', 'View Fleet Registry & Trip Logs', 'Vehicle Desk', 'Fleet Pool', 'VIEW', 'PAGE'),
    ('VEHICLE_CREATE', 'Register Vehicles & Drivers', 'Vehicle Desk', 'Fleet Pool', 'CREATE', 'ACTION'),
    ('VEHICLE_UPDATE', 'Log Trips, Odometer & Fuel', 'Vehicle Desk', 'Fleet Operations', 'UPDATE', 'ACTION'),
    ('VEHICLE_DELETE', 'Decommission Fleet Assets', 'Vehicle Desk', 'Fleet Pool', 'DELETE', 'ACTION'),
    ('VEHICLE_MANAGE', 'Full Fleet Governance & Compliance', 'Vehicle Desk', 'Fleet Operations', 'MANAGE', 'PAGE'),

    -- ==========================================
    -- 4. AMC & Vendor Contracts
    -- ==========================================
    ('AMC_VIEW', 'View Maintenance Contracts & Warranties', 'AMC', 'Vendor Contracts', 'VIEW', 'PAGE'),
    ('AMC_CREATE', 'Create AMC Contract Agreements', 'AMC', 'Vendor Contracts', 'CREATE', 'ACTION'),
    ('AMC_UPDATE', 'Renew AMCs & Sign Off Visits', 'AMC', 'Vendor Contracts', 'UPDATE', 'ACTION'),
    ('AMC_DELETE', 'Terminate AMC Contracts', 'AMC', 'Vendor Contracts', 'DELETE', 'ACTION'),
    ('AMC_MANAGE', 'Full AMC & Vendor Governance', 'AMC', 'Vendor Contracts', 'MANAGE', 'PAGE'),

    -- ==========================================
    -- 5. Requirements Planning & Approvals
    -- ==========================================
    ('REQUIREMENTS_VIEW', 'View Requirements Master', 'Requirements', 'Scope Planning', 'VIEW', 'PAGE'),
    ('REQUIREMENTS_CREATE', 'Draft Scope Proposals', 'Requirements', 'Scope Planning', 'CREATE', 'ACTION'),
    ('REQUIREMENTS_UPDATE', 'Modify Scope & Deliverables', 'Requirements', 'Scope Planning', 'UPDATE', 'ACTION'),
    ('REQUIREMENTS_APPROVE', 'Sign Off Requirement Approvals', 'Requirements', 'Approval Matrix', 'APPROVE', 'ACTION'),
    ('REQUIREMENTS_DELETE', 'Cancel/Purge Requirements', 'Requirements', 'Scope Planning', 'DELETE', 'ACTION'),
    ('REQUIREMENTS_MANAGE', 'Full Requirements Governance', 'Requirements', 'Scope Planning', 'MANAGE', 'PAGE'),

    -- ==========================================
    -- 6. SLA Governance & Breaches
    -- ==========================================
    ('SLA_VIEW', 'View SLA Metrics & Active Timers', 'SLA', 'Service Timers', 'VIEW', 'PAGE'),
    ('SLA_CONFIG', 'Configure SLA Response Thresholds', 'SLA', 'Policy Rules', 'UPDATE', 'ACTION'),
    ('SLA_MANAGE', 'Full SLA Escalation Governance', 'SLA', 'Policy Rules', 'MANAGE', 'PAGE')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    module = EXCLUDED.module,
    submodule = EXCLUDED.submodule,
    action = EXCLUDED.action,
    resource_type = EXCLUDED.resource_type;

-- 3. Bind ALL permissions to SUPER_ADMIN, ROLE_SUPER_ADMIN, and ROLE_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r
CROSS JOIN permissions p
WHERE r.code IN ('SUPER_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ADMIN', 'SUPERADMIN')
ON CONFLICT DO NOTHING;

-- 4. Assign baseline View permissions to Standard Staff/Agent Roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code IN ('ROLE_STAFF', 'ROLE_AGENT', 'VIEWER', 'USER')
  AND p.code IN ('DESIGN_VIEW', 'LEARNING_VIEW', 'VEHICLE_VIEW', 'AMC_VIEW', 'REQUIREMENTS_VIEW', 'SLA_VIEW', 'TICKETS_VIEW', 'WORKSPACES_VIEW')
ON CONFLICT DO NOTHING;

-- 5. Assign Engineering permissions to Design Roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code IN ('DESIGN_ADMIN', 'DESIGN_LEAD')
  AND p.code LIKE 'DESIGN_%'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code IN ('CONSULTANT', 'SITE_ENGINEER')
  AND p.code IN ('DESIGN_VIEW', 'DESIGN_CREATE', 'DESIGN_UPDATE', 'LEARNING_VIEW')
ON CONFLICT DO NOTHING;
