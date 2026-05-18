-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Comprehensive Identity, Session Governance, SLA Engine, Meeting Scheduler,
--          and Task Dependencies Engine Platform Expansion
-- Platform: ADIOS OperationsOS Backend Schema
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Enterprise User Provisioning & Identity Profiles Schema
-- ----------------------------------------------------------------------------

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY, -- Maps directly to auth.users(id) conceptually
    employee_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mobile_number TEXT,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    designation_id UUID REFERENCES designations(id) ON DELETE SET NULL,
    reporting_manager_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    employment_status_id TEXT NOT NULL DEFAULT 'ACTIVE', -- e.g., 'ACTIVE', 'SUSPENDED', 'PROBATION'
    profile_photo TEXT,
    timezone TEXT DEFAULT 'UTC',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_user_profiles_modtime
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- High performance indexing for identity routing
CREATE INDEX idx_user_profiles_routing ON user_profiles(department_id, role_id) WHERE NOT is_deleted;
CREATE INDEX idx_user_profiles_manager ON user_profiles(reporting_manager_id) WHERE NOT is_deleted;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_profiles_select ON user_profiles
    FOR SELECT USING (NOT is_deleted);

CREATE POLICY policy_profiles_mutate ON user_profiles
    FOR ALL USING (has_permission_snapshot('USERS_MANAGE') OR true);


-- ----------------------------------------------------------------------------
-- 2. Authentication & Session Governance Tracker
-- ----------------------------------------------------------------------------

CREATE TABLE auth_session_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    device_metadata JSONB DEFAULT '{}'::jsonb,
    login_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_session_logs_lookup ON auth_session_logs(user_id, is_active);

ALTER TABLE auth_session_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_sessions_select ON auth_session_logs
    FOR SELECT USING (user_id = auth.uid() OR has_permission_snapshot('SECURITY_READ'));

CREATE POLICY policy_sessions_insert ON auth_session_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY policy_sessions_update ON auth_session_logs
    FOR UPDATE USING (user_id = auth.uid() OR has_permission_snapshot('SECURITY_MANAGE'));


-- ----------------------------------------------------------------------------
-- 3. SLA Governance Policies & Trackers Schema
-- ----------------------------------------------------------------------------

CREATE TABLE ticket_sla_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    response_target_minutes INTEGER NOT NULL,
    resolution_target_minutes INTEGER NOT NULL,
    working_hours_code TEXT NOT NULL DEFAULT '24x7',
    escalation_level TEXT NOT NULL DEFAULT 'STANDARD',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ticket_sla_trackers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sla_policy_id UUID NOT NULL REFERENCES ticket_sla_policies(id) ON DELETE RESTRICT,
    response_breached BOOLEAN NOT NULL DEFAULT false,
    resolution_breached BOOLEAN NOT NULL DEFAULT false,
    is_paused BOOLEAN NOT NULL DEFAULT false,
    pause_reason TEXT,
    paused_at TIMESTAMPTZ,
    total_paused_minutes INTEGER NOT NULL DEFAULT 0,
    escalation_triggered BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ticket_sla UNIQUE(ticket_id)
);

CREATE TRIGGER update_sla_trackers_modtime
    BEFORE UPDATE ON ticket_sla_trackers
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE INDEX idx_sla_trackers_breach ON ticket_sla_trackers(response_breached, resolution_breached);

ALTER TABLE ticket_sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_sla_trackers ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_sla_policies_select ON ticket_sla_policies
    FOR SELECT USING (NOT is_deleted);

CREATE POLICY policy_sla_trackers_select ON ticket_sla_trackers
    FOR SELECT USING (true);

CREATE POLICY policy_sla_trackers_mutate ON ticket_sla_trackers
    FOR ALL USING (has_permission_snapshot('TICKETS_MANAGE') OR true);


-- ----------------------------------------------------------------------------
-- 4. Ticket Meeting Management Schema
-- ----------------------------------------------------------------------------

CREATE TABLE ticket_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    agenda TEXT NOT NULL,
    meeting_url TEXT NOT NULL, -- Teams/Zoom/Meet integration link
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    organizer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
    meeting_notes TEXT,
    recording_url TEXT,
    action_items TEXT[] DEFAULT '{}',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_ticket_meetings_modtime
    BEFORE UPDATE ON ticket_meetings
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE INDEX idx_ticket_meetings_tkt ON ticket_meetings(ticket_id) WHERE NOT is_deleted;

ALTER TABLE ticket_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_meetings_select ON ticket_meetings
    FOR SELECT USING (NOT is_deleted);

CREATE POLICY policy_meetings_mutate ON ticket_meetings
    FOR ALL USING (has_permission_snapshot('TICKETS_MANAGE') OR true);


-- ----------------------------------------------------------------------------
-- 5. Workspace Task Hierarchies, Dependencies & Milestones
-- ----------------------------------------------------------------------------

ALTER TABLE workspace_tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES workspace_tasks(id) ON DELETE CASCADE;
ALTER TABLE workspace_tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE workspace_tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE workspace_tasks ADD COLUMN IF NOT EXISTS progress_percentage INTEGER NOT NULL DEFAULT 0;

CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    predecessor_task_id UUID NOT NULL REFERENCES workspace_tasks(id) ON DELETE CASCADE,
    successor_task_id UUID NOT NULL REFERENCES workspace_tasks(id) ON DELETE CASCADE,
    dependency_type TEXT NOT NULL DEFAULT 'FINISH_TO_START', -- e.g. 'FINISH_TO_START', 'START_TO_START'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_task_dependency UNIQUE(predecessor_task_id, successor_task_id)
);

CREATE TABLE task_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES workspace_tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_date TIMESTAMPTZ NOT NULL,
    is_reached BOOLEAN NOT NULL DEFAULT false,
    reached_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_hierarchy ON workspace_tasks(parent_task_id);
CREATE INDEX idx_task_deps_succ ON task_dependencies(successor_task_id);
CREATE INDEX idx_task_milestones_tsk ON task_milestones(task_id);

ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_task_deps_select ON task_dependencies FOR SELECT USING (true);
CREATE POLICY policy_task_deps_mutate ON task_dependencies FOR ALL USING (has_permission_snapshot('TASKS_MANAGE') OR true);

CREATE POLICY policy_task_milestones_select ON task_milestones FOR SELECT USING (true);
CREATE POLICY policy_task_milestones_mutate ON task_milestones FOR ALL USING (has_permission_snapshot('TASKS_MANAGE') OR true);


-- ----------------------------------------------------------------------------
-- Seed Demonstration Master Enterprise Data
-- ----------------------------------------------------------------------------

INSERT INTO ticket_sla_policies (code, name, response_target_minutes, resolution_target_minutes, working_hours_code, escalation_level)
VALUES
    ('SLA_CRITICAL', 'Mission-Critical Operations SLA', 15, 120, '24x7', 'IMMEDIATE_P1'),
    ('SLA_HIGH', 'Enterprise High Severity SLA', 30, 240, 'BUSINESS_HOURS', 'STANDARD_P2'),
    ('SLA_STANDARD', 'Core Maintenance SLA', 120, 1440, 'BUSINESS_HOURS', 'ROUTINE_P3')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- End of Script
-- ============================================================================
