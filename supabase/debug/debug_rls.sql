-- Debug script to find exactly why the task is hidden
-- Please run this in your Supabase SQL Editor and send me the result!

DO $$
DECLARE
    v_user_id UUID := '53b7dbae-6049-44a7-a9c1-4ba769b4c324'; -- SUPER ADMIN ID
    v_task_id UUID := '9650b2c5-4343-4f75-8143-e8a66e78dedf'; -- TSK-008104 ID
    v_is_super BOOLEAN;
    v_can_see BOOLEAN;
    v_role_code TEXT;
BEGIN
    -- 1. Pretend we are the SUPER ADMIN user
    PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);
    PERFORM set_config('request.jwt.claim.app_metadata', '{"role":"ROLE_ADMIN"}', true);
    PERFORM set_config('role', 'authenticated', true);

    -- 2. Check their role
    SELECT code INTO v_role_code FROM public.roles r JOIN public.user_master um ON um.role_id = r.id WHERE um.id = v_user_id;

    -- 3. Check is_super_admin()
    v_is_super := public.is_super_admin();

    -- 4. Check can_see_record()
    SELECT public.can_see_record(creator_id, assignee_id) INTO v_can_see 
    FROM public.workspace_tasks 
    WHERE id = v_task_id;

    -- Output the results
    RAISE NOTICE 'DEBUG RESULTS:';
    RAISE NOTICE 'Role Code: %', v_role_code;
    RAISE NOTICE 'is_super_admin: %', v_is_super;
    RAISE NOTICE 'can_see_record: %', v_can_see;
END $$;
