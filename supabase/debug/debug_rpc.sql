-- Create an RPC to test the exact fetchTasksByWorkspace query as the authenticated user
CREATE OR REPLACE FUNCTION public.debug_fetch_tasks()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_res jsonb;
BEGIN
    -- We will query exactly what PostgREST queries
    SELECT jsonb_agg(row_to_json(t)) INTO v_res FROM (
        SELECT id, workspace_id, creator_id, assignee_id
        FROM public.workspace_tasks
        WHERE workspace_id = '79944a53-658d-4a73-bc25-38b9399928b0'
    ) t;
    
    RETURN v_res;
END;
$$;
