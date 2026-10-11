-- ==============================================================================
-- Migration: 20261010200000_ensure_dms_tables.sql
-- Description: Ensures all DMS (Document Management System) tables, default
--              workspace rows, folders, documents, and audit tables are created
--              and accessible with full schema resilience and RLS permissions.
-- ==============================================================================

-- 1. DMS Workspaces
CREATE TABLE IF NOT EXISTS dms_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dms_workspaces ADD COLUMN IF NOT EXISTS description TEXT;

-- Seed default Chandak Corporate DMS workspace
INSERT INTO dms_workspaces (code, name, description)
VALUES ('CHANDAK_CORP', 'Chandak Corporate Workspace', 'Master DMS Repository for Chandak Group')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 2. DMS Folders
CREATE TABLE IF NOT EXISTS dms_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES dms_workspaces(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES dms_folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    path TEXT NOT NULL DEFAULT '',
    approval_required BOOLEAN DEFAULT true,
    inherit_permissions BOOLEAN DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dms_folders_ws ON dms_folders (workspace_id);
CREATE INDEX IF NOT EXISTS idx_dms_folders_parent ON dms_folders (parent_id);

-- Seed Root Chandak Folder if none exists
DO $$
DECLARE
    v_ws_id UUID;
    v_root_id UUID;
BEGIN
    SELECT id INTO v_ws_id FROM dms_workspaces WHERE code = 'CHANDAK_CORP' LIMIT 1;
    
    IF v_ws_id IS NOT NULL THEN
        SELECT id INTO v_root_id FROM dms_folders WHERE workspace_id = v_ws_id AND parent_id IS NULL LIMIT 1;
        
        IF v_root_id IS NULL THEN
            INSERT INTO dms_folders (workspace_id, parent_id, name, path, approval_required, inherit_permissions)
            VALUES (v_ws_id, NULL, 'Chandak Root Archive', 'chandak_root', true, true);
        END IF;
    END IF;
END $$;

-- 3. DMS Document Types
CREATE TABLE IF NOT EXISTS dms_doc_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO dms_doc_types (code, name, description) VALUES
    ('ARCH_DWG', 'Architectural Drawing', 'Master floor plans, elevations & sections'),
    ('STR_CALC', 'Structural Design & Calculations', 'RCC frames, structural steel & soil reports'),
    ('MEP_SPEC', 'MEPF Technical Specifications', 'HVAC, electrical, plumbing & fire safety specs'),
    ('STAT_NOC', 'Statutory Clearance & NOC', 'MCGM, Fire CFO, MOEF, Aviation sanctions'),
    ('GFC_TRANS', 'GFC Transmittal Slip', 'Official Good-for-Construction release package')
ON CONFLICT (code) DO NOTHING;

-- 4. DMS Documents & File Versioning
CREATE TABLE IF NOT EXISTS dms_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES dms_workspaces(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES dms_folders(id) ON DELETE CASCADE,
    doc_type_id UUID REFERENCES dms_doc_types(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    original_file_name TEXT,
    current_version_no INTEGER DEFAULT 1,
    approval_status TEXT DEFAULT 'PENDING',
    file_size_bytes BIGINT DEFAULT 0,
    mime_type TEXT,
    storage_key TEXT,
    is_locked BOOLEAN DEFAULT false,
    locked_by UUID,
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dms_documents_folder ON dms_documents (folder_id);
CREATE INDEX IF NOT EXISTS idx_dms_documents_ws ON dms_documents (workspace_id);

-- 5. DMS Audit Logs
CREATE TABLE IF NOT EXISTS dms_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    actor_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dms_audit_entity ON dms_audit_logs (entity_type, entity_id);

-- 6. Enable RLS and Grant Permissions
ALTER TABLE dms_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE dms_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE dms_doc_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE dms_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE dms_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dms_workspaces_public_read" ON dms_workspaces;
CREATE POLICY "dms_workspaces_public_read" ON dms_workspaces FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "dms_folders_public_all" ON dms_folders;
CREATE POLICY "dms_folders_public_all" ON dms_folders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "dms_doc_types_public_all" ON dms_doc_types;
CREATE POLICY "dms_doc_types_public_all" ON dms_doc_types FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "dms_documents_public_all" ON dms_documents;
CREATE POLICY "dms_documents_public_all" ON dms_documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "dms_audit_logs_public_all" ON dms_audit_logs;
CREATE POLICY "dms_audit_logs_public_all" ON dms_audit_logs FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON dms_workspaces TO authenticated, anon, service_role;
GRANT ALL ON dms_folders TO authenticated, anon, service_role;
GRANT ALL ON dms_doc_types TO authenticated, anon, service_role;
GRANT ALL ON dms_documents TO authenticated, anon, service_role;
GRANT ALL ON dms_audit_logs TO authenticated, anon, service_role;
