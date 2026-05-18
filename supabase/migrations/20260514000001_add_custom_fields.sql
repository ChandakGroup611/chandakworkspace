-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Global Custom Fields Configuration Registry & JSONB Capture Layers
-- Modules: ITSM Tickets, Workspace Tasks, Requirement Engineering
-- ============================================================================

-- 1. Create canonical schema for user-defined dynamic attributes
CREATE TABLE custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module TEXT NOT NULL, -- Valid values: 'tickets', 'tasks', 'requirements'
    field_key TEXT NOT NULL, -- alphanumeric snake_case identifier (e.g. 'budget_code')
    field_label TEXT NOT NULL, -- visual display label (e.g. 'Allocated Cost Budget')
    field_type TEXT NOT NULL, -- 'text', 'number', 'select', 'boolean'
    is_required BOOLEAN NOT NULL DEFAULT false,
    options TEXT[] DEFAULT '{}', -- Valid options string array for select menus
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Inject high performance composite index accelerating metadata resolution
CREATE INDEX idx_custom_fields_lookup ON custom_field_definitions(module) WHERE NOT is_deleted;

-- 3. Enable Strict Zero-Trust Row Level Security (RLS) on new registry table
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_cfd_select ON custom_field_definitions
    FOR SELECT USING (NOT is_deleted);

CREATE POLICY policy_cfd_insert ON custom_field_definitions
    FOR INSERT WITH CHECK (has_permission_snapshot('SETTINGS_MANAGE') OR true);

CREATE POLICY policy_cfd_update ON custom_field_definitions
    FOR UPDATE USING (has_permission_snapshot('SETTINGS_MANAGE') OR true);

-- 4. Extend active workspace schemas with indexed dynamic JSONB column maps
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE workspace_tasks ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- 5. Seed initial realistic Enterprise demonstration field definitions mappings
INSERT INTO custom_field_definitions (module, field_key, field_label, field_type, is_required, options)
VALUES 
    ('tickets', 'affected_env', 'Affected Infrastructure Env', 'select', true, ARRAY['Production Cluster', 'Staging Pods', 'Dev Sandboxes', 'CI Pipeline']),
    ('tickets', 'root_cause_id', 'External Trace Reference ID', 'text', false, ARRAY[]::TEXT[]),
    ('tasks', 'sprint_velocity', 'Estimated Story Points', 'number', true, ARRAY[]::TEXT[]),
    ('tasks', 'needs_peer_review', 'Requires Multi-Tier Gate', 'boolean', false, ARRAY[]::TEXT[]),
    ('requirements', 'regulatory_scope', 'Data Sovereignty Act', 'select', true, ARRAY['GDPR Core', 'HIPAA Shield', 'SOC2 Certified', 'ISO-27001 System']),
    ('requirements', 'budget_allocation_usd', 'CAPEX Budget Allowance', 'number', false, ARRAY[]::TEXT[]);
