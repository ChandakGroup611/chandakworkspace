-- 20260621000002_workspace_hierarchy_cte.sql

-- Create Mandatory Indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_parent_workspace
ON public.workspaces(parent_workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspaces_deleted
ON public.workspaces(is_deleted);

CREATE INDEX IF NOT EXISTS idx_workspaces_parent_deleted
ON public.workspaces(parent_workspace_id, is_deleted);

-- Create cycle-safe Recursive CTE function
CREATE OR REPLACE FUNCTION get_workspace_descendants(root_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
AS $$
  WITH RECURSIVE workspace_tree(id, path) AS (
    -- Base case: the root workspace itself
    SELECT id, ARRAY[id]
    FROM public.workspaces
    WHERE id = root_id 
    AND is_deleted = false
    
    UNION ALL
    
    -- Recursive step: find children of the current workspaces in the tree
    SELECT w.id, path || w.id
    FROM public.workspaces w
    JOIN workspace_tree wt ON w.parent_workspace_id = wt.id
    WHERE w.is_deleted = false
      AND NOT w.id = ANY(path) -- Cycle protection
  )
  SELECT id FROM workspace_tree;
$$;
