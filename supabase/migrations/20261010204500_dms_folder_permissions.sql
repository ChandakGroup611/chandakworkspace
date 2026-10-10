-- ==============================================================================
-- Migration: 20261010204500_dms_folder_permissions.sql
-- Description: Creates the DMS folder permissions table for granular folder-wise
--              access control (View, Upload, Download, Delete, Manage).
-- ==============================================================================

CREATE TABLE IF NOT EXISTS dms_folder_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID REFERENCES dms_folders(id) ON DELETE CASCADE,
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    role_code TEXT,
    can_view BOOLEAN DEFAULT true,
    can_upload BOOLEAN DEFAULT false,
    can_download BOOLEAN DEFAULT true,
    can_delete BOOLEAN DEFAULT false,
    can_manage BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dms_folder_perms_folder ON dms_folder_permissions (folder_id);
CREATE INDEX IF NOT EXISTS idx_dms_folder_perms_user ON dms_folder_permissions (user_id);

-- Enable RLS and Grant
ALTER TABLE dms_folder_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dms_folder_permissions_public_all" ON dms_folder_permissions;
CREATE POLICY "dms_folder_permissions_public_all" ON dms_folder_permissions FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON dms_folder_permissions TO authenticated, anon, service_role;
