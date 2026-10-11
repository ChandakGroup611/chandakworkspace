-- ==============================================================================
-- Migration: 20261011100000_seed_dms_standard_folders.sql
-- Description: Ensures standard DMS folder hierarchy exists in PostgreSQL
--              with real UUID primary keys for Chandak Corporate DMS.
-- ==============================================================================

DO $$
DECLARE
    v_ws_id UUID;
    v_root_id UUID;
BEGIN
    -- 1. Resolve Workspace
    SELECT id INTO v_ws_id FROM dms_workspaces WHERE code = 'CHANDAK_CORP' LIMIT 1;
    
    IF v_ws_id IS NOT NULL THEN
        -- 2. Ensure Root Folder
        SELECT id INTO v_root_id FROM dms_folders WHERE workspace_id = v_ws_id AND parent_id IS NULL LIMIT 1;
        
        IF v_root_id IS NULL THEN
            INSERT INTO dms_folders (workspace_id, parent_id, name, path, approval_required, inherit_permissions)
            VALUES (v_ws_id, NULL, 'Chandak Master Archive', 'chandak_root', true, true)
            RETURNING id INTO v_root_id;
        ELSE
            UPDATE dms_folders SET name = 'Chandak Master Archive' WHERE id = v_root_id;
        END IF;

        -- 3. Ensure Standard Subfolders
        IF NOT EXISTS (SELECT 1 FROM dms_folders WHERE parent_id = v_root_id AND name = 'Architectural Drawings (GFC)') THEN
            INSERT INTO dms_folders (workspace_id, parent_id, name, path, approval_required, inherit_permissions)
            VALUES (v_ws_id, v_root_id, 'Architectural Drawings (GFC)', 'chandak_root.arch', true, true);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM dms_folders WHERE parent_id = v_root_id AND name = 'Structural Designs & Proofs') THEN
            INSERT INTO dms_folders (workspace_id, parent_id, name, path, approval_required, inherit_permissions)
            VALUES (v_ws_id, v_root_id, 'Structural Designs & Proofs', 'chandak_root.str', true, true);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM dms_folders WHERE parent_id = v_root_id AND name = 'MEP Engineering & Coordination') THEN
            INSERT INTO dms_folders (workspace_id, parent_id, name, path, approval_required, inherit_permissions)
            VALUES (v_ws_id, v_root_id, 'MEP Engineering & Coordination', 'chandak_root.mep', true, true);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM dms_folders WHERE parent_id = v_root_id AND name = 'Transmittals & Dispatch Records') THEN
            INSERT INTO dms_folders (workspace_id, parent_id, name, path, approval_required, inherit_permissions)
            VALUES (v_ws_id, v_root_id, 'Transmittals & Dispatch Records', 'chandak_root.trans', true, true);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM dms_folders WHERE parent_id = v_root_id AND name = 'Specifications & Tender Docs') THEN
            INSERT INTO dms_folders (workspace_id, parent_id, name, path, approval_required, inherit_permissions)
            VALUES (v_ws_id, v_root_id, 'Specifications & Tender Docs', 'chandak_root.specs', true, true);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM dms_folders WHERE parent_id = v_root_id AND name = 'Statutory Approvals & NOCs') THEN
            INSERT INTO dms_folders (workspace_id, parent_id, name, path, approval_required, inherit_permissions)
            VALUES (v_ws_id, v_root_id, 'Statutory Approvals & NOCs', 'chandak_root.approv', true, true);
        END IF;
    END IF;
END $$;
