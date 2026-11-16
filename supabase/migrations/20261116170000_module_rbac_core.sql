-- ============================================================================
-- Migration: 20261116170000_module_rbac_core.sql
-- Description: Core Module-Wise RBAC Engine & Zero-Loss Access Backfill
-- Specification: docs/MODULE_RBAC_DESIGN.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DDL: Create module_roles and user_module_access tables
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.module_roles (
    module_code text NOT NULL,
    role_code text NOT NULL,
    name text NOT NULL,
    description text,
    permissions text[] NOT NULL DEFAULT '{}',
    is_system boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_module_roles PRIMARY KEY (module_code, role_code)
);

CREATE TABLE IF NOT EXISTS public.user_module_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.user_master(id) ON DELETE CASCADE,
    module_code text NOT NULL,
    role_code text NOT NULL,
    dashboard_key text,
    scope jsonb NOT NULL DEFAULT '{"type": "all"}'::jsonb,
    is_default boolean NOT NULL DEFAULT false,
    granted_by uuid REFERENCES public.user_master(id),
    granted_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_module_access_role FOREIGN KEY (module_code, role_code) REFERENCES public.module_roles(module_code, role_code) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_user_module_access UNIQUE NULLS NOT DISTINCT (user_id, module_code, dashboard_key)
);

CREATE INDEX IF NOT EXISTS idx_user_module_access_user_mod 
    ON public.user_module_access(user_id, module_code);

-- Enable Row Level Security
ALTER TABLE public.module_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_access ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'module_roles' AND policyname = 'Allow authenticated read module_roles') THEN
        CREATE POLICY "Allow authenticated read module_roles" ON public.module_roles FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_module_access' AND policyname = 'Allow users to read own module access') THEN
        CREATE POLICY "Allow users to read own module access" ON public.user_module_access FOR SELECT TO authenticated 
        USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_master um JOIN public.roles r ON r.id = um.role_id WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'USER_ADMIN', 'ROLE_ADMIN')));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_module_access' AND policyname = 'Allow admins to manage user_module_access') THEN
        CREATE POLICY "Allow admins to manage user_module_access" ON public.user_module_access FOR ALL TO authenticated 
        USING (EXISTS (SELECT 1 FROM public.user_master um JOIN public.roles r ON r.id = um.role_id WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'USER_ADMIN', 'ROLE_ADMIN')));
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. DML: Seed Standard Module Roles & Permission Arrays
-- ----------------------------------------------------------------------------

-- TASK_WORKFLOW
INSERT INTO public.module_roles (module_code, role_code, name, description, permissions)
VALUES
('TASK_WORKFLOW', 'WORKSPACE_ADMIN', 'Workspace Administrator', 'Full control over workspaces, templates, custom fields, tasks, tickets, requirements, AMC and SLA.', ARRAY[
    'WORKSPACES_VIEW','WORKSPACES_CREATE','WORKSPACES_UPDATE','WORKSPACES_SHARE','WORKSPACES_DELETE',
    'TASKS_VIEW','TASKS_CREATE','TASKS_UPDATE_CORE','TASKS_ASSIGN','TASKS_TRANSITION','TASKS_CHECKLIST','TASKS_COMMENT','TASKS_DELETE','SPRINTS_MANAGE',
    'TICKETS_VIEW','TICKETS_CREATE','TICKETS_RESOLVE','TICKETS_DELETE',
    'REQUIREMENTS_VIEW','REQUIREMENTS_CREATE','REQUIREMENTS_SUBMIT_UAT','REQUIREMENTS_APPROVE','REQUIREMENTS_DELETE',
    'AMC_VIEW','AMC_MANAGE','SLA_VIEW','SLA_CONFIG'
]),
('TASK_WORKFLOW', 'MANAGER', 'Workspace Manager', 'Manage workspaces, sprints, assign tasks, review requirements, handle tickets.', ARRAY[
    'WORKSPACES_VIEW','WORKSPACES_CREATE','WORKSPACES_UPDATE','WORKSPACES_SHARE',
    'TASKS_VIEW','TASKS_CREATE','TASKS_UPDATE_CORE','TASKS_ASSIGN','TASKS_TRANSITION','TASKS_CHECKLIST','TASKS_COMMENT','TASKS_DELETE','SPRINTS_MANAGE',
    'TICKETS_VIEW','TICKETS_CREATE','TICKETS_RESOLVE',
    'REQUIREMENTS_VIEW','REQUIREMENTS_CREATE','REQUIREMENTS_SUBMIT_UAT','REQUIREMENTS_APPROVE',
    'AMC_VIEW','AMC_MANAGE','SLA_VIEW'
]),
('TASK_WORKFLOW', 'MEMBER', 'Collaborator / Member', 'Create and execute assigned tasks, participate in discussions, log checklists, create tickets.', ARRAY[
    'WORKSPACES_VIEW','TASKS_VIEW','TASKS_CREATE','TASKS_UPDATE_CORE','TASKS_TRANSITION','TASKS_CHECKLIST','TASKS_COMMENT',
    'TICKETS_VIEW','TICKETS_CREATE',
    'REQUIREMENTS_VIEW','REQUIREMENTS_CREATE','REQUIREMENTS_SUBMIT_UAT',
    'AMC_VIEW','SLA_VIEW'
]),
('TASK_WORKFLOW', 'VIEWER', 'Observer / Read-Only', 'Read-only visibility into workspaces, tasks, tickets, and requirements in scope.', ARRAY[
    'WORKSPACES_VIEW','TASKS_VIEW','TICKETS_VIEW','REQUIREMENTS_VIEW','AMC_VIEW','SLA_VIEW'
])
ON CONFLICT (module_code, role_code) DO UPDATE SET permissions = EXCLUDED.permissions;

-- VEHICLE_DESK
INSERT INTO public.module_roles (module_code, role_code, name, description, permissions)
VALUES
('VEHICLE_DESK', 'FLEET_ADMIN', 'Fleet Administrator', 'Full administration of fleet, vehicles, compliance, maintenance, parts, vendors, and trip dispatch.', ARRAY[
    'VEHICLES_VIEW','VEHICLES_CREATE','VEHICLES_UPDATE','VEHICLES_DOCUMENTS','VEHICLES_DECOMMISSION',
    'MAINTENANCE_VIEW','MAINTENANCE_MANAGE','PARTS_VENDORS_MANAGE','DRIVERS_MANAGE',
    'TRIPS_VIEW','TRIPS_REQUEST','TRIPS_DISPATCH','FLEET_SETTINGS'
]),
('VEHICLE_DESK', 'FLEET_LEAD', 'Fleet Operational Lead', 'Operational management of vehicles, drivers, work orders, service logs, and trip dispatch.', ARRAY[
    'VEHICLES_VIEW','VEHICLES_UPDATE','VEHICLES_DOCUMENTS',
    'MAINTENANCE_VIEW','MAINTENANCE_MANAGE','DRIVERS_MANAGE',
    'TRIPS_VIEW','TRIPS_REQUEST','TRIPS_DISPATCH'
]),
('VEHICLE_DESK', 'REQUESTER', 'Trip Requester', 'View available vehicles and request trips for business logistics.', ARRAY[
    'VEHICLES_VIEW','TRIPS_VIEW','TRIPS_REQUEST'
]),
('VEHICLE_DESK', 'VIEWER', 'Fleet Viewer', 'Read-only view of fleet roster, vehicle specifications, and status logs.', ARRAY[
    'VEHICLES_VIEW','MAINTENANCE_VIEW','TRIPS_VIEW'
])
ON CONFLICT (module_code, role_code) DO UPDATE SET permissions = EXCLUDED.permissions;

-- DESIGN_TRACKING
INSERT INTO public.module_roles (module_code, role_code, name, description, permissions)
VALUES
('DESIGN_TRACKING', 'DESIGN_ADMIN', 'Design Administrator', 'Full control over design projects, packages, masters, matrix, drawings, GFC, and transmittals.', ARRAY[
    'DESIGN_PROJECTS_VIEW','DESIGN_PROJECTS_MANAGE','DESIGN_MASTERS_MANAGE',
    'MATRIX_EDIT','DRAWINGS_VIEW','DRAWINGS_UPLOAD','DRAWINGS_APPROVE_GFC',
    'TRANSMITTALS_CREATE','RFIS_VIEW','RFIS_RAISE','RFIS_RESPOND','DESIGN_SETTINGS'
]),
('DESIGN_TRACKING', 'DESIGN_LEAD', 'Design Project Lead', 'Manage matrix timeline, upload drawings, approve GFC revisions, issue transmittals, answer RFIs.', ARRAY[
    'DESIGN_PROJECTS_VIEW','MATRIX_EDIT',
    'DRAWINGS_VIEW','DRAWINGS_UPLOAD','DRAWINGS_APPROVE_GFC',
    'TRANSMITTALS_CREATE','RFIS_VIEW','RFIS_RAISE','RFIS_RESPOND'
]),
('DESIGN_TRACKING', 'CONTRIBUTOR', 'Design Contributor', 'Upload drawing revisions, participate in RFI consultations, view matrix schedule.', ARRAY[
    'DESIGN_PROJECTS_VIEW','DRAWINGS_VIEW','DRAWINGS_UPLOAD','RFIS_VIEW','RFIS_RAISE'
]),
('DESIGN_TRACKING', 'VIEWER', 'Drawing Viewer', 'Read-only access to drawing registers, transmittals, and schedule matrix.', ARRAY[
    'DESIGN_PROJECTS_VIEW','DRAWINGS_VIEW','RFIS_VIEW'
])
ON CONFLICT (module_code, role_code) DO UPDATE SET permissions = EXCLUDED.permissions;

-- CHANDAK_MEET
INSERT INTO public.module_roles (module_code, role_code, name, description, permissions)
VALUES
('CHANDAK_MEET', 'MEET_ADMIN', 'Meet Administrator', 'Full management of meetings, recurring cadences, rooms, templates, and decisions.', ARRAY[
    'MEETINGS_VIEW','MEETINGS_CREATE','MEETINGS_UPDATE','MEETINGS_DELETE',
    'SESSIONS_START_RUN','AGENDA_ADD_POINTS','MOM_RECORD_PUBLISH',
    'ACTION_ITEMS_ASSIGN','ACTION_ITEMS_UPDATE','MEET_SETTINGS'
]),
('CHANDAK_MEET', 'ORGANISER', 'Meeting Organiser / Chair', 'Create meetings, run sessions, manage agendas, record minutes, and assign action items.', ARRAY[
    'MEETINGS_VIEW','MEETINGS_CREATE','MEETINGS_UPDATE',
    'SESSIONS_START_RUN','AGENDA_ADD_POINTS','MOM_RECORD_PUBLISH',
    'ACTION_ITEMS_ASSIGN','ACTION_ITEMS_UPDATE'
]),
('CHANDAK_MEET', 'PARTICIPANT', 'Meeting Attendee', 'Attend scheduled sessions, propose agenda points (if open), view MOM, update owned action items.', ARRAY[
    'MEETINGS_VIEW','AGENDA_ADD_POINTS','ACTION_ITEMS_UPDATE'
])
ON CONFLICT (module_code, role_code) DO UPDATE SET permissions = EXCLUDED.permissions;

-- ORG_BUDGET
INSERT INTO public.module_roles (module_code, role_code, name, description, permissions)
VALUES
('ORG_BUDGET', 'BUDGET_ADMIN', 'Budget Administrator', 'Full control over project budgets, cost heads, GST rules, revisions, incurred expenses, and sign-offs.', ARRAY[
    'BUDGET_VIEW','BUDGET_PROJECT_MANAGE','COST_HEADS_MANAGE',
    'BUDGET_PREPARE','BUDGET_DEPT_EDIT','BUDGET_SUBMIT','BUDGET_APPROVE',
    'INCURRED_MANAGE','BUDGET_REPORTS_EXPORT','BUDGET_SETTINGS'
]),
('ORG_BUDGET', 'PREPARER', 'Budget Preparer', 'Open budget versions, import Excel worksheets, edit lines across all categories, submit for sign-off.', ARRAY[
    'BUDGET_VIEW','BUDGET_PREPARE','BUDGET_DEPT_EDIT','BUDGET_SUBMIT',
    'INCURRED_MANAGE','BUDGET_REPORTS_EXPORT'
]),
('ORG_BUDGET', 'DEPT_EDITOR', 'Department Cost Editor', 'Manage and input budget projections and actual cost incurred for assigned department.', ARRAY[
    'BUDGET_VIEW','BUDGET_DEPT_EDIT','INCURRED_MANAGE','BUDGET_REPORTS_EXPORT'
]),
('ORG_BUDGET', 'APPROVER', 'Executive Approver', 'Review budget variance, sign off on baseline versions, approve or reject cost escalations.', ARRAY[
    'BUDGET_VIEW','BUDGET_APPROVE','BUDGET_REPORTS_EXPORT'
]),
('ORG_BUDGET', 'VIEWER', 'Budget Auditor / Viewer', 'Read-only visibility into approved project budgets, cost incurred logs, and variance reports.', ARRAY[
    'BUDGET_VIEW','BUDGET_REPORTS_EXPORT'
])
ON CONFLICT (module_code, role_code) DO UPDATE SET permissions = EXCLUDED.permissions;

-- DASHBOARDS
INSERT INTO public.module_roles (module_code, role_code, name, description, permissions)
VALUES
('DASHBOARDS', 'EDITOR', 'Dashboard Analyst / Editor', 'Full access to KPI summaries, drill-down transaction tables, exports, scheduled emails, and conversational AI.', ARRAY[
    'VIEW','DETAILS','EXPORT','SCHEDULE','CHAT','ADMIN'
]),
('DASHBOARDS', 'VIEWER', 'Dashboard Viewer', 'Read-only access to KPI summaries and transaction details for the assigned dashboard.', ARRAY[
    'VIEW','DETAILS'
])
ON CONFLICT (module_code, role_code) DO UPDATE SET permissions = EXCLUDED.permissions;

-- CHANDAK_MESSENGER
INSERT INTO public.module_roles (module_code, role_code, name, description, permissions)
VALUES
('CHANDAK_MESSENGER', 'ADMIN', 'Messenger Administrator', 'Manage public channels, broadcast notices, and moderate message threads.', ARRAY[
    'MESSAGES_SEND','CHANNELS_CREATE','CHANNELS_MANAGE','MESSAGES_MODERATE'
]),
('CHANDAK_MESSENGER', 'MEMBER', 'Messenger Collaborator', 'Send direct and group messages, create direct conversations, upload files.', ARRAY[
    'MESSAGES_SEND','CHANNELS_CREATE'
])
ON CONFLICT (module_code, role_code) DO UPDATE SET permissions = EXCLUDED.permissions;

-- ----------------------------------------------------------------------------
-- 3. DML: Idempotent Data Backfill from Existing Tables
-- ----------------------------------------------------------------------------

-- A. Backfill TASK_WORKFLOW from user_modules
INSERT INTO public.user_module_access (user_id, module_code, role_code, is_default, scope)
SELECT 
    um.user_id,
    'TASK_WORKFLOW',
    CASE 
        WHEN r.code = 'SUPER_ADMIN' OR r.code = 'ROLE_ADMIN' THEN 'WORKSPACE_ADMIN'
        WHEN r.code = 'ROLE_MANAGER' THEN 'MANAGER'
        ELSE 'MEMBER'
    END,
    um.is_default,
    '{"type": "all"}'::jsonb
FROM public.user_modules um
JOIN public.modules_master m ON m.id = um.module_id
JOIN public.user_master u ON u.id = um.user_id
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE m.code = 'TASK_WORKFLOW' AND u.is_deleted = false
ON CONFLICT (user_id, module_code, dashboard_key) DO UPDATE
SET role_code = EXCLUDED.role_code, is_default = EXCLUDED.is_default;

-- B. Backfill VEHICLE_DESK from fleet_user_access
INSERT INTO public.user_module_access (user_id, module_code, role_code, is_default, scope)
SELECT 
    f.user_id,
    'VEHICLE_DESK',
    CASE 
        WHEN r.code = 'SUPER_ADMIN' OR r.code = 'ROLE_ADMIN' OR f.fleet_role = 'FLEET_ADMIN' OR f.can_manage_settings = true THEN 'FLEET_ADMIN'
        WHEN f.fleet_role IN ('FLEET_MANAGER', 'FLEET_STAFF', 'FLEET_WORKSHOP') OR f.can_manage_vehicles = true OR f.can_dispatch_trips = true THEN 'FLEET_LEAD'
        ELSE 'REQUESTER'
    END,
    false,
    CASE 
        WHEN f.assigned_vehicle_ids IS NOT NULL AND array_length(f.assigned_vehicle_ids, 1) > 0 
        THEN jsonb_build_object('type', 'vehicles', 'vehicle_ids', to_jsonb(f.assigned_vehicle_ids))
        ELSE '{"type": "all"}'::jsonb
    END
FROM public.fleet_user_access f
JOIN public.user_master u ON u.id = f.user_id
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE u.is_deleted = false
ON CONFLICT (user_id, module_code, dashboard_key) DO UPDATE
SET role_code = EXCLUDED.role_code, scope = EXCLUDED.scope;

-- C. Backfill DESIGN_TRACKING from design_user_access
INSERT INTO public.user_module_access (user_id, module_code, role_code, is_default, scope)
SELECT 
    d.user_id,
    'DESIGN_TRACKING',
    CASE 
        WHEN r.code = 'SUPER_ADMIN' OR r.code = 'ROLE_ADMIN' OR d.design_role = 'DESIGN_ADMIN' OR d.can_masters_manage = true THEN 'DESIGN_ADMIN'
        WHEN d.design_role = 'DESIGN_LEAD' OR d.can_drawings_approve_gfc = true THEN 'DESIGN_LEAD'
        WHEN d.design_role = 'DESIGN_COORDINATOR' OR d.can_matrix_edit = true OR d.can_drawings_upload = true THEN 'CONTRIBUTOR'
        ELSE 'VIEWER'
    END,
    false,
    CASE 
        WHEN d.project_access_type = 'ASSIGNED_ONLY' AND d.assigned_project_ids IS NOT NULL AND array_length(d.assigned_project_ids, 1) > 0
        THEN jsonb_build_object('type', 'projects', 'project_ids', to_jsonb(d.assigned_project_ids))
        ELSE '{"type": "all"}'::jsonb
    END
FROM public.design_user_access d
JOIN public.user_master u ON u.id = d.user_id
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE u.is_deleted = false
ON CONFLICT (user_id, module_code, dashboard_key) DO UPDATE
SET role_code = EXCLUDED.role_code, scope = EXCLUDED.scope;

-- D. Backfill ORG_BUDGET from budget_members
INSERT INTO public.user_module_access (user_id, module_code, role_code, is_default, scope)
SELECT 
    b.user_id,
    'ORG_BUDGET',
    CASE 
        WHEN r.code = 'SUPER_ADMIN' OR r.code = 'ROLE_ADMIN' OR b.role_id = 1 THEN 'BUDGET_ADMIN'
        WHEN b.role_id = 2 THEN 'PREPARER'
        WHEN b.role_id = 3 THEN 'DEPT_EDITOR'
        WHEN b.role_id = 4 THEN 'VIEWER'
        ELSE 'VIEWER'
    END,
    false,
    CASE 
        WHEN b.project_ids IS NOT NULL AND array_length(b.project_ids, 1) > 0 THEN jsonb_build_object('type', 'projects', 'project_ids', to_jsonb(b.project_ids))
        WHEN b.department_ids IS NOT NULL AND array_length(b.department_ids, 1) > 0 THEN jsonb_build_object('type', 'departments', 'department_ids', to_jsonb(b.department_ids))
        ELSE '{"type": "all"}'::jsonb
    END
FROM public.budget_members b
JOIN public.user_master u ON u.id = b.user_id
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE u.is_deleted = false AND b.active = true
ON CONFLICT (user_id, module_code, dashboard_key) DO UPDATE
SET role_code = EXCLUDED.role_code, scope = EXCLUDED.scope;

-- E. Backfill CHANDAK_MEET from user_modules
INSERT INTO public.user_module_access (user_id, module_code, role_code, is_default, scope)
SELECT 
    um.user_id,
    'CHANDAK_MEET',
    CASE 
        WHEN r.code = 'SUPER_ADMIN' OR r.code = 'ROLE_ADMIN' THEN 'MEET_ADMIN'
        WHEN dept.name IN ('IT', 'ERP') THEN 'ORGANISER'
        ELSE 'PARTICIPANT'
    END,
    false,
    '{"type": "all"}'::jsonb
FROM public.user_modules um
JOIN public.modules_master m ON m.id = um.module_id
JOIN public.user_master u ON u.id = um.user_id
LEFT JOIN public.departments dept ON dept.id = u.department_id
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE m.code = 'CHANDAK_MEET' AND u.is_deleted = false
ON CONFLICT (user_id, module_code, dashboard_key) DO UPDATE
SET role_code = EXCLUDED.role_code;

-- F. Backfill DASHBOARDS from dashboard_user_access
INSERT INTO public.user_module_access (user_id, module_code, role_code, dashboard_key, is_default, scope)
SELECT 
    d.user_id,
    'DASHBOARDS',
    CASE 
        WHEN r.code = 'SUPER_ADMIN' OR r.code = 'ROLE_ADMIN' THEN 'EDITOR'
        ELSE 'VIEWER'
    END,
    d.dashboard_key,
    false,
    CASE 
        WHEN d.company_ids IS NOT NULL AND array_length(d.company_ids, 1) > 0 THEN jsonb_build_object('type', 'companies', 'company_ids', to_jsonb(d.company_ids))
        ELSE '{"type": "all"}'::jsonb
    END
FROM public.dashboard_user_access d
JOIN public.user_master u ON u.id = d.user_id
LEFT JOIN public.roles r ON r.id = u.role_id
WHERE u.is_deleted = false
ON CONFLICT (user_id, module_code, dashboard_key) DO UPDATE
SET role_code = EXCLUDED.role_code, scope = EXCLUDED.scope;

-- G. Comprehensive Fallback from user_modules for any user module links
INSERT INTO public.user_module_access (user_id, module_code, role_code, is_default, scope)
SELECT 
    um.user_id,
    m.code,
    CASE 
        WHEN m.code = 'TASK_WORKFLOW' THEN 'MEMBER'
        WHEN m.code = 'VEHICLE_DESK' THEN 'REQUESTER'
        WHEN m.code = 'DESIGN_TRACKING' THEN 'VIEWER'
        WHEN m.code = 'CHANDAK_MEET' THEN 'PARTICIPANT'
        WHEN m.code = 'ORG_BUDGET' THEN 'VIEWER'
        WHEN m.code = 'DASHBOARDS' THEN 'VIEWER'
        WHEN m.code = 'CHANDAK_MESSENGER' THEN 'MEMBER'
        ELSE 'VIEWER'
    END,
    um.is_default,
    '{"type": "all"}'::jsonb
FROM public.user_modules um
JOIN public.modules_master m ON m.id = um.module_id
JOIN public.user_master u ON u.id = um.user_id
WHERE u.is_deleted = false
ON CONFLICT (user_id, module_code, dashboard_key) DO NOTHING;
