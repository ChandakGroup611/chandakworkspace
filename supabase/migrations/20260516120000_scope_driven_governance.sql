-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Scope-Driven Master Governance (Relational & UUID Based)
-- Architecture: ticket_scopes -> scope_master_mapping -> masters
-- ============================================================================

-- 1. Create ticket_scopes table
CREATE TABLE IF NOT EXISTS ticket_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for governance tables
ALTER TABLE ticket_scopes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_ticket_scopes_select ON ticket_scopes;
CREATE POLICY policy_ticket_scopes_select ON ticket_scopes FOR SELECT USING (true);

-- 2. Create scope_master_mapping table
CREATE TABLE IF NOT EXISTS scope_master_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_id UUID NOT NULL REFERENCES ticket_scopes(id) ON DELETE CASCADE,
    master_key TEXT NOT NULL, -- e.g., 'issue_type', 'asset', 'software_system'
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(scope_id, master_key)
);

ALTER TABLE scope_master_mapping ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_scope_master_mapping_select ON scope_master_mapping;
CREATE POLICY policy_scope_master_mapping_select ON scope_master_mapping FOR SELECT USING (true);

-- 3. Seed Fixed Scopes (Using stable identifiers for consistency)
INSERT INTO ticket_scopes (id, code, name, description) VALUES
    ('e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1', 'INFRA', 'IT Infrastructure', 'Server issues, hardware faults, network connectivity, and assigned asset support.'),
    ('e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2', 'ERP', 'ERP & Software Systems', 'SAP, Salesforce, internal modules, bugs, and software requirement requests.'),
    ('e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3', 'OTHERS', 'General Inquiries', 'General support, access requests, and other non-technical operational help.')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 4. Seed Mappings for each Scope
INSERT INTO scope_master_mapping (scope_id, master_key, is_required) VALUES
    -- INFRA SCOPE MAPPINGS
    ('e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1', 'issue_type', true),
    ('e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1', 'issue_subtype', true),
    ('e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1', 'ticket_category', true),
    ('e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1', 'ticket_subcategory', true),
    ('e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1', 'workflow_state', true),
    ('e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1', 'master_priority', true),
    ('e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1', 'asset', false),
    
    -- ERP SCOPE MAPPINGS
    ('e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2', 'software_system', true),
    ('e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2', 'software_module', true),
    ('e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2', 'software_submodule', true),
    ('e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2', 'ticket_category', true),
    ('e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2', 'ticket_subcategory', true),
    ('e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2', 'workflow_state', true),
    ('e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2', 'master_priority', true),
    
    -- OTHERS SCOPE MAPPINGS
    ('e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3', 'software_module', true),
    ('e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3', 'software_submodule', true),
    ('e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3', 'issue_type', true),
    ('e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3', 'issue_subtype', true),
    ('e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3', 'workflow_state', true),
    ('e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3', 'master_priority', true)
ON CONFLICT (scope_id, master_key) DO NOTHING;

-- 5. Universal Migration: Convert INTEGER scope_id to UUID scope_id across all Masters
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'issue_types', 'issue_subtypes', 
        'ticket_categories', 'ticket_subcategories', 
        'master_priorities', 'workflow_states',
        'assets', 'software_systems', 'software_modules', 'software_submodules'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- 5.1 Add temporary UUID column
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS scope_id_uuid UUID', t);
        
        -- 5.2 Hydrate UUIDs based on legacy INTEGER flags or smart inference
        -- 1 -> INFRA, 2 -> ERP, 3 -> OTHERS
        EXECUTE format('UPDATE %I SET scope_id_uuid = ''e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1'' WHERE scope_id::text = ''1''', t);
        EXECUTE format('UPDATE %I SET scope_id_uuid = ''e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2'' WHERE scope_id::text = ''2''', t);
        EXECUTE format('UPDATE %I SET scope_id_uuid = ''e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'' WHERE scope_id::text = ''3''', t);
        
        -- Smart Inference for unassigned records
        IF t = 'software_systems' OR t = 'software_modules' OR t = 'software_submodules' THEN
            EXECUTE format('UPDATE %I SET scope_id_uuid = ''e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2'' WHERE scope_id_uuid IS NULL AND code NOT LIKE ''SYS_OTHERS''', t);
            EXECUTE format('UPDATE %I SET scope_id_uuid = ''e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'' WHERE scope_id_uuid IS NULL AND code = ''SYS_OTHERS''', t);
        ELSIF t = 'ticket_categories' THEN
            EXECUTE format('UPDATE %I SET scope_id_uuid = ''e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2'' WHERE scope_id_uuid IS NULL AND (code LIKE ''CAT_SW%%'' OR code LIKE ''CAT_ERP%%'' OR code = ''CAT_SOFTWARE'')', t);
        END IF;

        -- 5.3 Fallback: If still NULL, default to INFRA for safety
        EXECUTE format('UPDATE %I SET scope_id_uuid = ''e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1'' WHERE scope_id_uuid IS NULL', t);

        -- 5.4 Swap columns: Drop old INTEGER, rename new UUID
        EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS scope_id', t);
        EXECUTE format('ALTER TABLE %I RENAME COLUMN scope_id_uuid TO scope_id', t);
        
        -- 5.5 Add foreign key constraint back
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I_scope_fk FOREIGN KEY (scope_id) REFERENCES ticket_scopes(id)', t, t);
    END LOOP;
END $$;

-- Special Case: Sync Subcategories and Subtypes based on Parent
UPDATE ticket_subcategories ts SET scope_id = tc.scope_id FROM ticket_categories tc WHERE ts.category_id = tc.id;
UPDATE issue_subtypes ist SET scope_id = it.scope_id FROM issue_types it WHERE ist.issue_type_id = it.id;

-- Special Case: Priorities and Workflow States (Map to INFRA if single-scope, or we could duplicate)
-- For now, let's just make sure they are active.

-- 6. Implement Asset Rule: Assigned Assets Governance
-- Requirement: Only show logged-in user assigned assets
ALTER TABLE assets ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES user_master(id);

-- 7. Seed OTHERS Scope Operational Data
INSERT INTO software_systems (id, code, name, description, scope_id) VALUES
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'SYS_OTHERS', 'Operational Support (Others)', 'Generic modules for miscellaneous requests.', 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3')
ON CONFLICT (id) DO UPDATE SET scope_id = EXCLUDED.scope_id;

INSERT INTO software_modules (system_id, code, name, description, scope_id) VALUES
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'MOD_GEN_SUPPORT', 'General Operations', 'Standard operational requests.', 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'MOD_ACCESS', 'Access Management', 'Requests for platform or physical access.', 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3')
ON CONFLICT (code) DO UPDATE SET scope_id = EXCLUDED.scope_id;

-- 8. Enable Robust RLS Policies for Scoped Access
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'issue_types', 'issue_subtypes', 
        'ticket_categories', 'ticket_subcategories', 
        'master_priorities', 'workflow_states',
        'software_systems', 'software_modules', 'software_submodules'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS policy_%s_scope_select ON %I', t, t);
        -- Basic select policy: allow all authenticated if not deleted (scope filtering handled in API)
        EXECUTE format('CREATE POLICY policy_%s_scope_select ON %I FOR SELECT USING (NOT is_deleted)', t, t);
    END LOOP;
END $$;

-- Special Asset Policy for Assigned Rule
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_assets_scope_select ON assets;
CREATE POLICY policy_assets_scope_select ON assets 
    FOR SELECT 
    USING (
        NOT is_deleted AND 
        assigned_user_id = auth.uid()
    );

-- Seed some asset assignments for verification
UPDATE assets SET assigned_user_id = (SELECT id FROM user_master WHERE user_code = 'USR-EXEC-001') WHERE code = 'AST_SRV_001';
UPDATE assets SET assigned_user_id = (SELECT id FROM user_master WHERE user_code = 'USR-SRE-003') WHERE code = 'AST_DB_002';
