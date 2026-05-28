-- ============================================================================
-- Phase P5: Distributed Async Event Engine
-- 1. Create event_queue table
-- 2. Modify task trigger to insert into event_queue instead of doing sync fanout
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.event_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    actor_id UUID,
    payload JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    failed_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    workspace_id UUID -- For efficient member lookup during fanout
);

CREATE INDEX IF NOT EXISTS idx_event_queue_status ON public.event_queue (status);
CREATE INDEX IF NOT EXISTS idx_event_queue_created_at ON public.event_queue (created_at);

-- ============================================================================
-- Rewrite Trigger Function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_task_audit_and_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_actor_id UUID;
    v_action TEXT;
    v_old_state JSONB := NULL;
    v_new_state JSONB := NULL;
    v_task_id UUID;
    v_task_title TEXT;
    v_workspace_id UUID;
    v_msg TEXT;
    v_status_old TEXT;
    v_status_new TEXT;
BEGIN
    -- Determine the actor
    v_actor_id := auth.uid();
    
    IF TG_OP = 'INSERT' THEN
        v_task_id := NEW.id;
        v_task_title := NEW.subject;
        v_workspace_id := NEW.workspace_id;
        v_action := 'CREATE';
        v_new_state := to_jsonb(NEW);
        v_actor_id := COALESCE(v_actor_id, NEW.created_by);
    ELSIF TG_OP = 'UPDATE' THEN
        v_task_id := NEW.id;
        v_task_title := NEW.subject;
        v_workspace_id := NEW.workspace_id;
        v_old_state := to_jsonb(OLD);
        v_new_state := to_jsonb(NEW);
        
        IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
            v_action := 'DELETE';
        ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
            v_action := 'RESTORE';
        ELSIF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
            v_action := 'STATUS_CHANGE';
            SELECT status_name INTO v_status_old FROM public.status_master WHERE id = OLD.status_id;
            SELECT status_name INTO v_status_new FROM public.status_master WHERE id = NEW.status_id;
            v_new_state := to_jsonb(NEW) || jsonb_build_object('status_name', v_status_new, 'old_status_name', v_status_old);
        ELSE
            v_action := 'UPDATE';
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    -- WRITE TO ACTIVITY LOG (task_activity_logs)
    INSERT INTO public.task_activity_logs (task_id, actor_id, action, old_state, new_state)
    VALUES (v_task_id, v_actor_id, v_action, v_old_state, v_new_state);

    -- WRITE TO CORE AUDIT LOG (task_audit_logs)
    INSERT INTO public.task_audit_logs (task_id, actor_id, operation, before_values, after_values)
    VALUES (v_task_id, COALESCE(v_actor_id, '00000000-0000-0000-0000-000000000000'::uuid), v_action, v_old_state, v_new_state);

    -- GENERATE NOTIFICATION MESSAGE
    IF v_action = 'CREATE' THEN
        v_msg := 'Task "' || v_task_title || '" has been created.';
    ELSIF v_action = 'DELETE' THEN
        v_msg := 'Task "' || v_task_title || '" has been deleted.';
    ELSIF v_action = 'RESTORE' THEN
        v_msg := 'Task "' || v_task_title || '" has been restored.';
    ELSIF v_action = 'STATUS_CHANGE' THEN
        v_msg := 'Task "' || v_task_title || '" status transitioned from ' || COALESCE(v_status_old, 'Open') || ' to ' || COALESCE(v_status_new, 'Closed') || '.';
    ELSIF v_action = 'CHECKLIST_UPDATE' THEN
        v_msg := 'Task "' || v_task_title || '" checklist has been updated.';
    ELSIF v_action = 'COMMENT' THEN
        v_msg := 'New remarks/updates added to task "' || v_task_title || '".';
    ELSIF v_action = 'UPDATE' THEN
        v_msg := 'Task "' || v_task_title || '" details have been updated.';
    END IF;

    -- ========================================================================
    -- PHASE P5: EVENT QUEUE ASYNC BACKBONE
    -- Instead of looping through workspace members synchronously here,
    -- we write ONE event to the event_queue. An external worker will pick
    -- this up, fetch the members, and bulk insert notifications asynchronously.
    -- ========================================================================
    INSERT INTO public.event_queue (
        event_type, entity_type, entity_id, actor_id, workspace_id, payload
    ) VALUES (
        'TASK_' || v_action, 'task', v_task_id, v_actor_id, v_workspace_id, 
        jsonb_build_object('message', v_msg, 'title', v_task_title)
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;
