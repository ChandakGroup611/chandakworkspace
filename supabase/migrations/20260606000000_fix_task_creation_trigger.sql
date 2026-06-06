-- 1. Sync any missing users from auth.users to public.user_master
INSERT INTO public.user_master (id, full_name, user_code, email, role_id, is_active, is_deleted)
SELECT 
    u.id,
    COALESCE(u.raw_user_meta_data ->> 'full_name', 'Unnamed User'),
    COALESCE(u.raw_user_meta_data ->> 'user_code', 'USR-' || upper(substring(u.id::text from 1 for 8))),
    u.email,
    (SELECT id FROM public.roles WHERE code = 'ROLE_STAFF'),
    TRUE,
    FALSE
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM public.user_master)
ON CONFLICT (id) DO NOTHING;

-- 2. Harden the task audit & notification trigger function
CREATE OR REPLACE FUNCTION public.handle_task_audit_and_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_actor_id UUID;
    v_action TEXT;
    v_old_state JSONB := NULL;
    v_new_state JSONB := NULL;
    v_task_id UUID;
    v_workspace_id UUID;
    v_event_type TEXT;
BEGIN
    -- Determine the actor
    v_actor_id := auth.uid();
    
    IF TG_OP = 'INSERT' THEN
        v_task_id := NEW.id;
        v_workspace_id := NEW.workspace_id;
        v_action := 'CREATE';
        v_event_type := 'task.created';
        v_new_state := to_jsonb(NEW);
        v_actor_id := COALESCE(v_actor_id, NEW.created_by);
    ELSIF TG_OP = 'UPDATE' THEN
        v_task_id := NEW.id;
        v_workspace_id := NEW.workspace_id;
        v_old_state := to_jsonb(OLD);
        v_new_state := to_jsonb(NEW);
        
        IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
            v_action := 'DELETE';
            v_event_type := 'task.deleted';
        ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
            v_action := 'RESTORE';
            v_event_type := 'task.restored';
        ELSIF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
            v_action := 'STATUS_CHANGE';
            v_event_type := 'task.updated';
        ELSE
            v_action := 'UPDATE';
            v_event_type := 'task.updated';
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    -- HARDENING: Ensure the actor_id exists in user_master, otherwise set it to NULL
    -- to prevent FK violations on public.task_activity_logs or system_domain_events
    IF v_actor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user_master WHERE id = v_actor_id) THEN
        v_actor_id := NULL;
    END IF;

    -- WRITE TO ACTIVITY LOG (task_activity_logs) - UI Specific
    INSERT INTO public.task_activity_logs (task_id, actor_id, action, old_state, new_state)
    VALUES (v_task_id, v_actor_id, v_action, v_old_state, v_new_state);

    -- WRITE TO CORE AUDIT LOG (task_audit_logs) - UI Specific
    INSERT INTO public.task_audit_logs (task_id, actor_id, operation, before_values, after_values)
    VALUES (v_task_id, COALESCE(v_actor_id, '00000000-0000-0000-0000-000000000000'::uuid), v_action, v_old_state, v_new_state);

    -- EMIT IMMUTABLE DOMAIN EVENT (Replaces the loop over workspace_members and inserts into notification_queue)
    IF v_action IN ('CREATE', 'DELETE', 'RESTORE', 'STATUS_CHANGE') THEN
        INSERT INTO public.system_domain_events (event_type, entity_id, actor_id, payload, priority)
        VALUES (v_event_type, v_task_id, v_actor_id, jsonb_build_object(
            'workspace_id', v_workspace_id,
            'action', v_action,
            'old_state', v_old_state,
            'new_state', v_new_state
        ), 'NORMAL');
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$;
