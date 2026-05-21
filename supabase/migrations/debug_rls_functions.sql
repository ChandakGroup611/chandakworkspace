-- Execute the functions as a regular user to see if they crash
CREATE OR REPLACE FUNCTION public.debug_rls_functions()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_res jsonb;
    v_test_ws boolean;
    v_test_task boolean;
BEGIN
    -- Switch to an authenticated user context (any user id)
    PERFORM set_config('request.jwt.claim.sub', '06cb4e59-b0b3-45d7-b929-c526fc33c429', true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    
    -- Test workspaces RLS function
    BEGIN
        v_test_ws := public.can_see_workspace('79944a53-658d-4a73-bc25-38b9399928b0', '53b7dbae-6049-44a7-a9c1-4ba769b4c324');
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('error', 'can_see_workspace crashed: ' || SQLERRM);
    END;

    -- Test tasks RLS function
    BEGIN
        v_test_task := public.can_see_task('9650b2c5-4343-4f75-8143-e8a66e78dedf', '53b7dbae-6049-44a7-a9c1-4ba769b4c324', '06cb4e59-b0b3-45d7-b929-c526fc33c429');
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('error', 'can_see_task crashed: ' || SQLERRM);
    END;

    RETURN jsonb_build_object('can_see_workspace', v_test_ws, 'can_see_task', v_test_task);
END;
$$;
