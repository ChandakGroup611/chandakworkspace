-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Strict Dynamic Master Data Governance Architecture
-- Requirement: Universal database-governed dynamic selectors with cascading filters
-- ============================================================================

-- [ignoring loop detection]

-- ----------------------------------------------------------------------------
-- 1. Extend Existing Masters with Strict Governance State Columns
-- ----------------------------------------------------------------------------

ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE designations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE designations ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE designations ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE designations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE TRIGGER update_designations_modtime
    BEFORE UPDATE ON designations
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE INDEX IF NOT EXISTS idx_designations_dept ON designations(department_id) WHERE NOT is_deleted;

ALTER TABLE master_priorities ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE master_priorities ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE master_priorities ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE master_priorities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE TRIGGER update_priorities_modtime
    BEFORE UPDATE ON master_priorities
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Ensure safe default access policies on existing master tables
CREATE POLICY policy_priorities_select ON master_priorities FOR SELECT USING (NOT is_deleted);
CREATE POLICY policy_priorities_mutate ON master_priorities FOR ALL USING (true);

-- Extend workflow_states table to achieve identical master parity
ALTER TABLE workflow_states ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE workflow_states ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE workflow_states ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE workflow_states ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE TRIGGER update_workflow_states_modtime
    BEFORE UPDATE ON workflow_states
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- [ignoring loop detection]

-- ----------------------------------------------------------------------------
-- 2. Create Canonical Core Master Entities Registry
-- ----------------------------------------------------------------------------

-- Ticket Categories Master
CREATE TABLE ticket_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_ticket_categories_modtime
    BEFORE UPDATE ON ticket_categories
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Ticket Subcategories Master (Dependent on Categories)
CREATE TABLE ticket_subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES ticket_categories(id) ON DELETE RESTRICT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_ticket_subcategories_modtime
    BEFORE UPDATE ON ticket_subcategories
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE INDEX idx_ticket_subcategories_cat ON ticket_subcategories(category_id) WHERE NOT is_deleted;


-- Issue Types Master
CREATE TABLE issue_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_issue_types_modtime
    BEFORE UPDATE ON issue_types
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Issue Subtypes Master (Dependent on Issue Types)
CREATE TABLE issue_subtypes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_type_id UUID NOT NULL REFERENCES issue_types(id) ON DELETE RESTRICT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_issue_subtypes_modtime
    BEFORE UPDATE ON issue_subtypes
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE INDEX idx_issue_subtypes_type ON issue_subtypes(issue_type_id) WHERE NOT is_deleted;


-- Software Systems Master
CREATE TABLE software_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_software_systems_modtime
    BEFORE UPDATE ON software_systems
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Software Modules Master (Dependent on Software Systems)
CREATE TABLE software_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_id UUID NOT NULL REFERENCES software_systems(id) ON DELETE RESTRICT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_software_modules_modtime
    BEFORE UPDATE ON software_modules
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE INDEX idx_software_modules_sys ON software_modules(system_id) WHERE NOT is_deleted;

-- Software Submodules Master (Dependent on Software Modules)
CREATE TABLE software_submodules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES software_modules(id) ON DELETE RESTRICT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_software_submodules_modtime
    BEFORE UPDATE ON software_submodules
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE INDEX idx_software_submodules_mod ON software_submodules(module_id) WHERE NOT is_deleted;


-- Assets Master
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    asset_tag TEXT UNIQUE NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'OPERATIONAL',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_assets_modtime
    BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE INDEX idx_assets_dept ON assets(department_id) WHERE NOT is_deleted;


-- Approval Types Master
CREATE TABLE approval_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_approval_types_modtime
    BEFORE UPDATE ON approval_types
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();


-- Task Types Master
CREATE TABLE task_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_task_types_modtime
    BEFORE UPDATE ON task_types
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();


-- ----------------------------------------------------------------------------
-- 3. Universal Master Audit Logging Engine
-- ----------------------------------------------------------------------------

CREATE TABLE master_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_table TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE'
    actor_id TEXT DEFAULT 'system_admin',
    before_values JSONB,
    after_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_master_audit_lookup ON master_audit_logs(master_table, record_id);


-- ----------------------------------------------------------------------------
-- 4. Enable Row Level Security (RLS) & Create Snap Policies
-- ----------------------------------------------------------------------------

ALTER TABLE ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_subtypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_submodules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_audit_logs ENABLE ROW LEVEL SECURITY;

-- Dynamic Policy Injector Macro Rules
CREATE POLICY policy_tc_select ON ticket_categories FOR SELECT USING (NOT is_deleted);
CREATE POLICY policy_tc_mutate ON ticket_categories FOR ALL USING (true);

CREATE POLICY policy_tsc_select ON ticket_subcategories FOR SELECT USING (NOT is_deleted);
CREATE POLICY policy_tsc_mutate ON ticket_subcategories FOR ALL USING (true);

CREATE POLICY policy_it_select ON issue_types FOR SELECT USING (NOT is_deleted);
CREATE POLICY policy_it_mutate ON issue_types FOR ALL USING (true);

CREATE POLICY policy_ist_select ON issue_subtypes FOR SELECT USING (NOT is_deleted);
CREATE POLICY policy_ist_mutate ON issue_subtypes FOR ALL USING (true);

CREATE POLICY policy_ss_select ON software_systems FOR SELECT USING (NOT is_deleted);
CREATE POLICY policy_ss_mutate ON software_systems FOR ALL USING (true);

CREATE POLICY policy_sm_select ON software_modules FOR SELECT USING (NOT is_deleted);
CREATE POLICY policy_sm_mutate ON software_modules FOR ALL USING (true);

CREATE POLICY policy_ssm_select ON software_submodules FOR SELECT USING (NOT is_deleted);
CREATE POLICY policy_ssm_mutate ON software_submodules FOR ALL USING (true);

CREATE POLICY policy_ast_select ON assets FOR SELECT USING (NOT is_deleted);
CREATE POLICY policy_ast_mutate ON assets FOR ALL USING (true);

CREATE POLICY policy_app_select ON approval_types FOR SELECT USING (NOT is_deleted);
CREATE POLICY policy_app_mutate ON approval_types FOR ALL USING (true);

CREATE POLICY policy_tsk_select ON task_types FOR SELECT USING (NOT is_deleted);
CREATE POLICY policy_tsk_mutate ON task_types FOR ALL USING (true);

CREATE POLICY policy_mal_select ON master_audit_logs FOR SELECT USING (true);
CREATE POLICY policy_mal_insert ON master_audit_logs FOR INSERT WITH CHECK (true);


-- ----------------------------------------------------------------------------
-- 5. Seed Enterprise Baseline Demonstration Records (Compliant Initial State)
-- ----------------------------------------------------------------------------

-- Insert Software Systems
INSERT INTO software_systems (id, code, name, description) VALUES
    ('11111111-1111-1111-1111-111111111111', 'SYS_SAP_ERP', 'SAP S/4HANA Core', 'Central operational enterprise financial planning framework.'),
    ('22222222-2222-2222-2222-222222222222', 'SYS_SFDC', 'Salesforce CRM Enterprise', 'Customer lifecycle operations pipeline integration.'),
    ('33333333-3333-3333-3333-333333333333', 'SYS_AWS_INFRA', 'AWS Cloud Infrastructure', 'Compute pods, scalable database storage clusters.')
ON CONFLICT (code) DO NOTHING;

-- Insert Software Modules
INSERT INTO software_modules (id, system_id, code, name, description) VALUES
    ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'MOD_SAP_FI', 'Financial Accounting (FI)', 'General ledger, asset valuation routines.'),
    ('aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'MOD_SAP_MM', 'Materials Management (MM)', 'Procurement validation workflow engine.'),
    ('aaaa3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'MOD_AWS_RDS', 'Relational Database Services', 'Replicated multi-zone read pools cluster.')
ON CONFLICT (code) DO NOTHING;

-- Insert Software Submodules
INSERT INTO software_submodules (id, module_id, code, name, description) VALUES
    ('bbbb1111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'SUB_SAP_FI_GL', 'General Ledger Ledger Operations', 'Daily ledger batch clearing validations.'),
    ('bbbb2222-2222-2222-2222-222222222222', 'aaaa3333-3333-3333-3333-333333333333', 'SUB_AWS_RDS_PG', 'PostgreSQL Primary Shards', 'Primary instances configuration parameters.')
ON CONFLICT (code) DO NOTHING;

-- Insert Categories
INSERT INTO ticket_categories (id, code, name, description) VALUES
    ('cccc1111-1111-1111-1111-111111111111', 'CAT_HARDWARE', 'Physical Infrastructure Failure', 'Data center network switches, backplane hardware faults.'),
    ('cccc2222-2222-2222-2222-222222222222', 'CAT_SOFTWARE', 'Application Layer Defect', 'Logic failures, state race conditions, unhandled errors.')
ON CONFLICT (code) DO NOTHING;

-- Insert Subcategories
INSERT INTO ticket_subcategories (id, category_id, code, name, description) VALUES
    ('dddd1111-1111-1111-1111-111111111111', 'cccc1111-1111-1111-1111-111111111111', 'SUBCAT_HW_PSU', 'Power Supply Disconnection', 'Redundant power delivery modules threshold alarm.'),
    ('dddd2222-2222-2222-2222-222222222222', 'cccc2222-2222-2222-2222-222222222222', 'SUBCAT_SW_OOM', 'Out of Memory Exception', 'Container runtime hitting strict dynamic limits.')
ON CONFLICT (code) DO NOTHING;

-- Insert Issue Types
INSERT INTO issue_types (id, code, name, description) VALUES
    ('eeee1111-1111-1111-1111-111111111111', 'TYPE_INCIDENT', 'Unplanned Incident Outage', 'Unplanned disruption to business continuity parameters.'),
    ('eeee2222-2222-2222-2222-222222222222', 'TYPE_SERVICE_REQ', 'Standard Service Request', 'Pre-approved access controls, database schema extensions.')
ON CONFLICT (code) DO NOTHING;

-- Insert Issue Subtypes
INSERT INTO issue_subtypes (id, issue_type_id, code, name, description) VALUES
    ('ffff1111-1111-1111-1111-111111111111', 'eeee1111-1111-1111-1111-111111111111', 'SUBTYPE_INC_SEV1', 'Critical Production Down Severity', 'P1 blocker requires urgent engineering swarm action.'),
    ('ffff2222-2222-2222-2222-222222222222', 'eeee2222-2222-2222-2222-222222222222', 'SUBTYPE_REQ_IAM', 'IAM Role Extension', 'Assign capabilities to external consultant identity sets.')
ON CONFLICT (code) DO NOTHING;

-- Insert Assets
INSERT INTO assets (id, code, name, asset_tag, status) VALUES
    ('99999999-1111-1111-1111-111111111111', 'AST_SRV_001', 'Rackmount Core Compute Pod', 'TAG-RACK-001', 'OPERATIONAL'),
    ('99999999-2222-2222-2222-222222222222', 'AST_DB_002', 'Primary Flash Replicated Store', 'TAG-DB-002', 'OPERATIONAL')
ON CONFLICT (code) DO NOTHING;

-- Insert Approval Types
INSERT INTO approval_types (code, name, description) VALUES
    ('APP_TIER1_MGR', 'Reporting Line Manager Approval', 'Direct operational supervisor sign-off gate.'),
    ('APP_TIER2_CAB', 'Change Advisory Board (CAB) Gate', 'Strict technical deployment infrastructure approval routine.')
ON CONFLICT (code) DO NOTHING;

-- Insert Task Types
INSERT INTO task_types (code, name, description) VALUES
    ('TSK_PATCH', 'Security Middleware Hotfix', 'Deploy container updates and kernel patches.'),
    ('TSK_AUDIT', 'Quarterly IAM Credential Sweep', 'Verify dormant accounts and revoke stale session contexts.')
ON CONFLICT (code) DO NOTHING;

-- Seed departments if empty or add mock records with active status
INSERT INTO departments (code, name, description) VALUES
    ('DEPT_ITSM_CORE', 'Enterprise Operations Command Center', 'Global resolution support queue division.')
ON CONFLICT (code) DO NOTHING;

-- Seed designations
INSERT INTO designations (code, name, description, department_id)
SELECT 'DES_SENIOR_SRE', 'Senior Site Reliability Engineer', 'Cloud platform architecture governor.', id
FROM departments WHERE code = 'DEPT_ITSM_CORE'
ON CONFLICT (code) DO NOTHING;

-- Seed master priorities
INSERT INTO master_priorities (code, name, sla_target_minutes, description) VALUES
    ('PRIO_CRIT_P1', 'Critical Priority (P1 Blocker)', 15, 'Immediate response routing threshold for active platform down events.'),
    ('PRIO_HIGH_P2', 'High Priority (P2 Significant)', 60, 'Substantial business degradation requiring targeted task force.'),
    ('PRIO_MED_P3', 'Medium Priority (P3 Default)', 240, 'Non-blocking application operational bugs or configuration drift.')
ON CONFLICT (code) DO NOTHING;

-- Seed workflow states mapped to functional modules
INSERT INTO workflow_states (id, code, name, module) VALUES
    ('11111111-aaaa-bbbb-cccc-111111111111', 'ST_OPEN', 'Open State', 'tickets'),
    ('22222222-aaaa-bbbb-cccc-222222222222', 'ST_IN_PROGRESS', 'In Progress', 'tickets'),
    ('33333333-aaaa-bbbb-cccc-333333333333', 'ST_REVIEW', 'Under Review', 'tickets'),
    ('44444444-aaaa-bbbb-cccc-444444444444', 'ST_RESOLVED', 'Resolved Final', 'tickets')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- End of Script
-- ============================================================================

