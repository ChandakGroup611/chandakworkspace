-- Create computed column for recursive task count
CREATE OR REPLACE FUNCTION public.hierarchy_task_count(ws public.workspaces)
RETURNS INTEGER AS $$
DECLARE
    total_tasks INTEGER;
BEGIN
    WITH RECURSIVE workspace_tree AS (
        -- Base case: the current workspace
        SELECT id
        FROM public.workspaces
        WHERE id = ws.id
        
        UNION ALL
        
        -- Recursive step: sub-workspaces
        SELECT w.id
        FROM public.workspaces w
        INNER JOIN workspace_tree wt ON w.parent_workspace_id = wt.id
        WHERE w.is_deleted = false
    )
    SELECT COALESCE(SUM(s.task_count + s.subtask_count), 0)
    INTO total_tasks
    FROM workspace_tree wt
    LEFT JOIN public.workspace_statistics s ON s.workspace_id = wt.id;
    
    RETURN total_tasks;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create computed column for recursive sub-workspace count
CREATE OR REPLACE FUNCTION public.hierarchy_subws_count(ws public.workspaces)
RETURNS INTEGER AS $$
DECLARE
    total_subws INTEGER;
BEGIN
    WITH RECURSIVE workspace_tree AS (
        -- Base case: children of the current workspace
        SELECT id
        FROM public.workspaces
        WHERE parent_workspace_id = ws.id AND is_deleted = false
        
        UNION ALL
        
        -- Recursive step: sub-workspaces
        SELECT w.id
        FROM public.workspaces w
        INNER JOIN workspace_tree wt ON w.parent_workspace_id = wt.id
        WHERE w.is_deleted = false
    )
    SELECT COUNT(*)
    INTO total_subws
    FROM workspace_tree;
    
    RETURN total_subws;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
