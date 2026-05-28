-- ============================================================================
-- ADIOS PLATFORM MIGRATION - P9 TRIGGER REFACTOR (DECOUPLE DB FROM DELIVERY)
-- ============================================================================

-- 1. REFACTOR TICKETS TRIGGER
-- ----------------------------------------------------------------------------
-- We remove all hardcoded inserts into notification_queue and email_queue.
-- The database now ONLY emits immutable domain events. The background worker handles delivery.

CREATE OR REPLACE FUNCTION public.handle_ticket_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id UUID;
    v_actor_name TEXT;
    v_operation TEXT;
    v_event_type TEXT;
BEGIN
    -- 1.1 Identify Action Caller (Actor)
    IF (TG_OP = 'DELETE') THEN
        v_actor_id := COALESCE(auth.uid(), OLD.creator_id);
    ELSE
        v_actor_id := COALESCE(auth.uid(), NEW.creator_id);
    END IF;
    
    -- 1.2 Determine Lifecycle Operation
    IF (TG_OP = 'INSERT') THEN
        v_operation := 'CREATE';
        v_event_type := 'ticket.created';
    ELSIF (TG_OP = 'DELETE') THEN
        v_operation := 'DELETE';
        v_event_type := 'ticket.deleted';
    ELSE
        IF (NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE) THEN
            v_operation := 'DELETE';
            v_event_type := 'ticket.deleted';
        ELSE
            v_operation := 'UPDATE';
            v_event_type := 'ticket.updated';
        END IF;
    END IF;

    -- 1.3 Populate Standalone Immutable Audit Logs (Keep local UI audit logs)
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.ticket_audit_logs (ticket_id, actor_id, operation, before_values, after_values)
        VALUES (NEW.id, v_actor_id, 'CREATE', NULL, to_jsonb(NEW));
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.ticket_audit_logs (ticket_id, actor_id, operation, before_values, after_values)
        VALUES (OLD.id, v_actor_id, 'DELETE', to_jsonb(OLD), NULL);
    ELSE
        INSERT INTO public.ticket_audit_logs (ticket_id, actor_id, operation, before_values, after_values)
        VALUES (NEW.id, v_actor_id, v_operation, to_jsonb(OLD), to_jsonb(NEW));
    END IF;

    -- 1.4 Publish Immutable Domain Event to the Event Bus
    IF (v_operation = 'CREATE') THEN
        INSERT INTO public.system_domain_events (event_type, entity_id, actor_id, payload, priority)
        VALUES (v_event_type, NEW.id, v_actor_id, jsonb_build_object('ticket', to_jsonb(NEW)), 'NORMAL');
    ELSIF (v_operation = 'DELETE') THEN
        INSERT INTO public.system_domain_events (event_type, entity_id, actor_id, payload, priority)
        VALUES (v_event_type, OLD.id, v_actor_id, jsonb_build_object('ticket', to_jsonb(OLD)), 'NORMAL');
    ELSIF (v_operation = 'UPDATE') THEN
        -- Only emit event if there are substantial changes to notify about
        IF (OLD.status_id IS DISTINCT FROM NEW.status_id) OR (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
            INSERT INTO public.system_domain_events (event_type, entity_id, actor_id, payload, priority)
            VALUES (v_event_type, NEW.id, v_actor_id, jsonb_build_object(
                'old_ticket', to_jsonb(OLD),
                'new_ticket', to_jsonb(NEW)
            ), 'NORMAL');
        END IF;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. REFACTOR TASKS TRIGGER
-- ----------------------------------------------------------------------------
-- We remove synchronous loops over workspace_members and inserts into legacy queues.

CREATE OR REPLACE FUNCTION public.handle_task_audit_and_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;
