-- Let's create an RPC that executes the query EXACTLY as PostgREST would, as the user!
CREATE OR REPLACE FUNCTION public.debug_fetch_tasks_as_arun()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_res jsonb;
BEGIN
    -- Impersonate Arun
    PERFORM set_config('request.jwt.claim.sub', 'a585c2eb-e95b-4e5e-932f-ed13c7668e87', true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    
    -- Try the query
    BEGIN
        SELECT jsonb_agg(row_to_json(t)) INTO v_res FROM (
            SELECT 
                wt.id, 
                wt.title, 
                wt.assignee_id,
                (SELECT jsonb_agg(row_to_json(a)) FROM public.task_assignees a WHERE a.task_id = wt.id) as assignees
            FROM public.workspace_tasks wt
            WHERE wt.workspace_id = '02fbb5b9-2469-42aa-acda-f809f6175860'
            AND wt.is_deleted = false
        ) t;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
    END;

    RETURN v_res;
END;
$$;
