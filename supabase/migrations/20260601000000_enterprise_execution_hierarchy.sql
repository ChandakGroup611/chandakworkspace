-- ============================================================================
-- Phase 1: Enterprise Hierarchical Workspace Tree
-- ============================================================================

-- 1. Modify workspaces table to support infinite adjacency list hierarchy
ALTER TABLE public.workspaces 
    ADD COLUMN IF NOT EXISTS parent_workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS workspace_path TEXT,
    ADD COLUMN IF NOT EXISTS level_no INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create high-performance indexes for tree traversal
CREATE INDEX IF NOT EXISTS idx_workspaces_parent_id ON public.workspaces(parent_workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_path ON public.workspaces(workspace_path);
CREATE INDEX IF NOT EXISTS idx_workspaces_level ON public.workspaces(level_no);

-- 2. Migrate existing sub_workspaces into the unified workspaces table
-- First, ensure any sub-workspaces created recently are ported over as child workspaces
DO $$
DECLARE
    sw_record RECORD;
    v_workspace_id UUID;
    v_new_id UUID;
    v_workspace_code TEXT;
    v_company_id UUID;
BEGIN
    FOR sw_record IN SELECT * FROM public.sub_workspaces WHERE is_deleted = false LOOP
        -- Generate a code
        v_workspace_code := 'SW-' || substr(md5(random()::text), 1, 6);
        
        -- Get parent company_id
        SELECT company_id INTO v_company_id FROM public.workspaces WHERE id = sw_record.workspace_id;
        
        -- Insert as a child workspace
        INSERT INTO public.workspaces (
            company_id,
            workspace_name,
            workspace_code,
            description,
            workspace_owner_id,
            parent_workspace_id,
            level_no,
            is_active
        ) VALUES (
            v_company_id,
            sw_record.name,
            v_workspace_code,
            sw_record.description,
            sw_record.created_by, -- Assuming created_by is owner for now
            sw_record.workspace_id,
            1,
            true
        ) RETURNING id INTO v_new_id;
        
        -- Migrate sub_workspace_members to workspace_members for this new ID
        INSERT INTO public.workspace_members (workspace_id, user_id, role)
        SELECT v_new_id, user_id, role FROM public.sub_workspace_members
        WHERE sub_workspace_id = sw_record.id;
        
        -- Re-map any tasks assigned to this sub_workspace to the new workspace_id
        UPDATE public.tasks 
        SET workspace_id = v_new_id,
            sub_workspace_id = NULL
        WHERE sub_workspace_id = sw_record.id;
        
    END LOOP;
END;
$$;

-- 3. Deprecate the old sub_workspaces tables safely
-- We will just rename them for safety rather than dropping immediately during this transition phase.
ALTER TABLE IF EXISTS public.sub_workspaces RENAME TO deprecated_sub_workspaces;
ALTER TABLE IF EXISTS public.sub_workspace_members RENAME TO deprecated_sub_workspace_members;

-- 4. Re-calculate workspace paths for existing data (Backfill)
WITH RECURSIVE workspace_tree AS (
    -- Base case: Root workspaces
    SELECT 
        id, 
        parent_workspace_id, 
        workspace_name::text as generated_path,
        0 as generated_level
    FROM public.workspaces
    WHERE parent_workspace_id IS NULL
    
    UNION ALL
    
    -- Recursive step: Child workspaces
    SELECT 
        w.id, 
        w.parent_workspace_id, 
        wt.generated_path || '/' || w.workspace_name as generated_path,
        wt.generated_level + 1 as generated_level
    FROM public.workspaces w
    INNER JOIN workspace_tree wt ON w.parent_workspace_id = wt.id
)
UPDATE public.workspaces w
SET 
    workspace_path = wt.generated_path,
    level_no = wt.generated_level
FROM workspace_tree wt
WHERE w.id = wt.id;
