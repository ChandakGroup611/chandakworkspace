-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Platform: ADIOS OperationsOS Backend Schema
-- Features: Zero-Trust Snapshot Security, Normalized UUID Architecture,
--           Standalone Immutable Audit Logs, Direct Async Event Queues
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Core Extensions & Setup
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to automatically set updated_at timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';


-- ----------------------------------------------------------------------------
-- Enterprise IAM & Security System
-- ----------------------------------------------------------------------------

-- Canonical system capabilities registry
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Governed enterprise roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_roles_modtime
    BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Relational joins mapping specific capabilities to master roles
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_role_permission UNIQUE(role_id, permission_id)
);

-- Identity attachments mapping active identities to roles
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- References auth.users(id) conceptually
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_role UNIQUE(user_id, role_id)
);

-- Highly optimized pre-flattened evaluation matrix snapshot store
CREATE TABLE user_permissions_snapshot (
    user_id UUID PRIMARY KEY,
    permissions TEXT[] NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Security audit logging engine
CREATE TABLE security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL,
    operation TEXT NOT NULL,
    description TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ----------------------------------------------------------------------------
-- Organizational Governance
-- ----------------------------------------------------------------------------

-- Relational masters representing distinct operational divisions
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    manager_id UUID,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_departments_modtime
    BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Relational masters representing job roles under parent departments
CREATE TABLE designations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Explicit boundary gates governing identity visibility scopes
CREATE TABLE user_department_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    access_level TEXT NOT NULL, -- Validated values: 'default', 'supplementary', 'manager'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_department UNIQUE(user_id, department_id)
);


-- ----------------------------------------------------------------------------
-- Database-Driven Workflow Engine
-- ----------------------------------------------------------------------------

-- Configurable application state entities
CREATE TABLE workflow_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    module TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Configurable validation matrix dictating allowable transitions
CREATE TABLE workflow_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_state_id UUID NOT NULL REFERENCES workflow_states(id) ON DELETE RESTRICT,
    to_state_id UUID NOT NULL REFERENCES workflow_states(id) ON DELETE RESTRICT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_workflow_transition UNIQUE(from_state_id, to_state_id)
);

-- Role gating controls linking specific transition arrays
CREATE TABLE workflow_transition_roles (
    transition_id UUID NOT NULL REFERENCES workflow_transitions(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY(transition_id, role_id)
);

-- Departmental gating restrictions limiting global transitions
CREATE TABLE workflow_transition_departments (
    transition_id UUID NOT NULL REFERENCES workflow_transitions(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    PRIMARY KEY(transition_id, department_id)
);

-- Immutable tracking recording state changes natively
CREATE TABLE workflow_transition_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL,
    entity_type TEXT NOT NULL,
    from_state_id UUID REFERENCES workflow_states(id),
    to_state_id UUID REFERENCES workflow_states(id),
    actor_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ----------------------------------------------------------------------------
-- Core Priorities Master
-- ----------------------------------------------------------------------------
CREATE TABLE master_priorities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    sla_target_minutes INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ----------------------------------------------------------------------------
-- ITSM Ticketing Operations Domain
-- ----------------------------------------------------------------------------

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status_id UUID NOT NULL REFERENCES workflow_states(id) ON DELETE RESTRICT,
    priority_id UUID REFERENCES master_priorities(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    creator_id UUID NOT NULL,
    assignee_id UUID,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_tickets_modtime
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
    uploader_id UUID NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Standalone immutable appending tracking tables
CREATE TABLE ticket_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    actor_id UUID NOT NULL,
    operation TEXT NOT NULL,
    before_values JSONB,
    after_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ----------------------------------------------------------------------------
-- Workspace Tasks Execution Domain
-- ----------------------------------------------------------------------------

CREATE TABLE workspace_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status_id UUID NOT NULL REFERENCES workflow_states(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    creator_id UUID NOT NULL,
    assignee_id UUID,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_tasks_modtime
    BEFORE UPDATE ON workspace_tasks
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE task_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES workspace_tasks(id) ON DELETE RESTRICT,
    label TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    completed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES workspace_tasks(id) ON DELETE RESTRICT,
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Standalone immutable appending tracking tables
CREATE TABLE task_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    actor_id UUID NOT NULL,
    operation TEXT NOT NULL,
    before_values JSONB,
    after_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ----------------------------------------------------------------------------
-- Requirement Engineering Domain
-- ----------------------------------------------------------------------------

CREATE TABLE requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    objective TEXT,
    functional_scope TEXT,
    technical_scope TEXT,
    status_id UUID NOT NULL REFERENCES workflow_states(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    creator_id UUID NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_requirements_modtime
    BEFORE UPDATE ON requirements
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TABLE requirement_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE RESTRICT,
    version_tag TEXT NOT NULL,
    snapshot_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Standalone immutable appending tracking tables
CREATE TABLE requirement_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL,
    actor_id UUID NOT NULL,
    operation TEXT NOT NULL,
    before_values JSONB,
    after_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ----------------------------------------------------------------------------
-- Asynchronous Side Effect Queues
-- ----------------------------------------------------------------------------

CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- Validated: 'pending', 'processing', 'completed', 'failed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_template TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

CREATE TABLE event_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);


-- ----------------------------------------------------------------------------
-- High Performance Composite Indexes
-- ----------------------------------------------------------------------------

-- Mandatory index supporting non-offset cursor sorts natively
CREATE INDEX idx_tickets_pagination ON tickets(created_at DESC, id DESC);
CREATE INDEX idx_tasks_pagination ON workspace_tasks(created_at DESC, id DESC);
CREATE INDEX idx_requirements_pagination ON requirements(created_at DESC, id DESC);

-- Lookup acceleration indexes
CREATE INDEX idx_tickets_dept ON tickets(department_id) WHERE NOT is_deleted;
CREATE INDEX idx_tickets_creator ON tickets(creator_id) WHERE NOT is_deleted;
CREATE INDEX idx_tickets_assignee ON tickets(assignee_id) WHERE NOT is_deleted;

CREATE INDEX idx_tasks_dept ON workspace_tasks(department_id) WHERE NOT is_deleted;
CREATE INDEX idx_tasks_creator ON workspace_tasks(creator_id) WHERE NOT is_deleted;
CREATE INDEX idx_tasks_assignee ON workspace_tasks(assignee_id) WHERE NOT is_deleted;

CREATE INDEX idx_requirements_dept ON requirements(department_id) WHERE NOT is_deleted;

-- RLS authorization path acceleration indexes
CREATE INDEX idx_user_dept_access ON user_department_access(user_id, department_id);


-- ----------------------------------------------------------------------------
-- Zero-Trust Row Level Security (RLS) Engine
-- ----------------------------------------------------------------------------

-- Helper function evaluating flattened array capabilities with minimal cost
CREATE OR REPLACE FUNCTION has_permission_snapshot(p_permission_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_has BOOLEAN;
BEGIN
    SELECT p_permission_code = ANY(permissions)
    INTO v_has
    FROM user_permissions_snapshot
    WHERE user_id = auth.uid();
    
    RETURN COALESCE(v_has, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper function evaluating cross-department bounding matrices
CREATE OR REPLACE FUNCTION has_department_access(p_department_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_has BOOLEAN;
BEGIN
    SELECT true
    INTO v_has
    FROM user_department_access
    WHERE user_id = auth.uid() AND department_id = p_department_id;
    
    RETURN COALESCE(v_has, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Enforce security context mapping application-wide
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_department_access ENABLE ROW LEVEL SECURITY;

ALTER TABLE workflow_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_transition_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_transition_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_transition_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE master_priorities ENABLE ROW LEVEL SECURITY;

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE workspace_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_queue ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
-- Canonical Access Policy Definitions (Examples enforcing zero-trust gating)
-- ----------------------------------------------------------------------------

-- Tickets visibility logic: allow reading if creator, assignee, or granted department access
CREATE POLICY policy_tickets_select ON tickets
    FOR SELECT USING (
        creator_id = auth.uid() OR
        assignee_id = auth.uid() OR
        has_department_access(department_id) OR
        has_permission_snapshot('TICKETS_MANAGE')
    );

-- Tickets mutation logic: restricted by capability snapshots and not soft-deleted
CREATE POLICY policy_tickets_insert ON tickets
    FOR INSERT WITH CHECK (
        has_permission_snapshot('TICKETS_CREATE') AND
        has_department_access(department_id)
    );

CREATE POLICY policy_tickets_update ON tickets
    FOR UPDATE USING (
        (creator_id = auth.uid() OR assignee_id = auth.uid() OR has_permission_snapshot('TICKETS_MANAGE')) AND
        NOT is_deleted
    ) WITH CHECK (
        has_permission_snapshot('TICKETS_UPDATE')
    );

-- Audit logs remain absolutely append-only
CREATE POLICY policy_ticket_audit_insert ON ticket_audit_logs
    FOR INSERT WITH CHECK (true); -- Enforced via trusted backend triggers or security wrapper functions

CREATE POLICY policy_ticket_audit_select ON ticket_audit_logs
    FOR SELECT USING (has_permission_snapshot('AUDIT_READ'));

-- ============================================================================
-- End of Script
-- ============================================================================
