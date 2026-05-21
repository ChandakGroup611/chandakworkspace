-- 20260521143000_fix_task_delete_cascade.sql

-- 1. Update the trigger to NOT insert logs on HARD DELETE 
-- (since soft-delete is handled via UPDATE and hard delete cascades)
CREATE OR REPLACE FUNCTION public.handle_task_audit_and_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_actor_id UUID;
    v_action TEXT;
    v_old_state JSONB := NULL;
    v_new_state JSONB := NULL;
    v_task_id UUID;
    v_task_title TEXT;
    v_notify_user_id UUID;
    v_msg TEXT;
    v_status_old TEXT;
    v_status_new TEXT;
    r RECORD;
BEGIN
    -- Determine the actor
    v_actor_id := auth.uid();
    
    IF TG_OP = 'INSERT' THEN
        v_task_id := NEW.id;
        v_task_title := NEW.title;
        v_action := 'CREATE';
        v_new_state := to_jsonb(NEW);
        v_actor_id := COALESCE(v_actor_id, NEW.creator_id);
    ELSIF TG_OP = 'UPDATE' THEN
        v_task_id := NEW.id;
        v_task_title := NEW.title;
        v_old_state := to_jsonb(OLD);
        v_new_state := to_jsonb(NEW);
        
        IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
            v_action := 'DELETE';
        ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
            v_action := 'RESTORE';
        ELSIF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
            v_action := 'STATUS_CHANGE';
            SELECT name INTO v_status_old FROM public.workflow_states WHERE id = OLD.status_id;
            SELECT name INTO v_status_new FROM public.workflow_states WHERE id = NEW.status_id;
            v_new_state := to_jsonb(NEW) || jsonb_build_object('status_name', v_status_new, 'old_status_name', v_status_old);
        ELSIF OLD.remarks IS DISTINCT FROM NEW.remarks THEN
            v_action := 'COMMENT';
        ELSE
            v_action := 'UPDATE';
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- Skip inserting activity logs on hard delete to prevent foreign key violations.
        -- Hard deletes only happen via cascade (e.g. workspace deletion) or admin cleanup.
        RETURN OLD;
    END IF;

    -- WRITE TO ACTIVITY LOG (task_activity_logs)
    INSERT INTO public.task_activity_logs (task_id, actor_id, action, old_state, new_state)
    VALUES (v_task_id, v_actor_id, v_action, v_old_state, v_new_state);

    -- WRITE TO CORE AUDIT LOG (task_audit_logs)
    INSERT INTO public.task_audit_logs (task_id, actor_id, operation, before_values, after_values)
    VALUES (v_task_id, COALESCE(v_actor_id, '00000000-0000-0000-0000-000000000000'::uuid), v_action, v_old_state, v_new_state);

    -- TRIGGER NOTIFICATIONS (task_notifications)
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

    -- Send notification to creator
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        v_notify_user_id := NEW.creator_id;
    END IF;

    IF v_notify_user_id IS NOT NULL THEN
        INSERT INTO public.task_notifications (user_id, title, message, link, is_read)
        VALUES (v_notify_user_id, 'Task Activity: ' || v_action, v_msg, '/tasks/' || v_task_id, false);
    END IF;

    -- Send notification to assignee
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        v_notify_user_id := NEW.assignee_id;
    END IF;

    IF v_notify_user_id IS NOT NULL AND v_notify_user_id != COALESCE(NEW.creator_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
        INSERT INTO public.task_notifications (user_id, title, message, link, is_read)
        VALUES (v_notify_user_id, 'Task Activity: ' || v_action, v_msg, '/tasks/' || v_task_id, false);
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- 2. Update Foreign Key constraints to ON DELETE CASCADE for task relationships
-- This allows workspaces -> tasks -> logs to be deleted cleanly.

DO $$
BEGIN
    -- task_activity_logs
    ALTER TABLE public.task_activity_logs DROP CONSTRAINT IF EXISTS task_activity_logs_task_id_fkey;
    ALTER TABLE public.task_activity_logs ADD CONSTRAINT task_activity_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.workspace_tasks(id) ON DELETE CASCADE;

    -- task_audit_logs
    ALTER TABLE public.task_audit_logs DROP CONSTRAINT IF EXISTS task_audit_logs_task_id_fkey;
    ALTER TABLE public.task_audit_logs ADD CONSTRAINT task_audit_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.workspace_tasks(id) ON DELETE CASCADE;

    -- task_assignees
    ALTER TABLE public.task_assignees DROP CONSTRAINT IF EXISTS task_assignees_task_id_fkey;
    ALTER TABLE public.task_assignees ADD CONSTRAINT task_assignees_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.workspace_tasks(id) ON DELETE CASCADE;

    -- task_teams
    ALTER TABLE public.task_teams DROP CONSTRAINT IF EXISTS task_teams_task_id_fkey;
    ALTER TABLE public.task_teams ADD CONSTRAINT task_teams_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.workspace_tasks(id) ON DELETE CASCADE;

    -- task_attachments
    ALTER TABLE public.task_attachments DROP CONSTRAINT IF EXISTS task_attachments_task_id_fkey;
    ALTER TABLE public.task_attachments ADD CONSTRAINT task_attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.workspace_tasks(id) ON DELETE CASCADE;

    -- task_checklists
    ALTER TABLE public.task_checklists DROP CONSTRAINT IF EXISTS task_checklists_task_id_fkey;
    ALTER TABLE public.task_checklists ADD CONSTRAINT task_checklists_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.workspace_tasks(id) ON DELETE CASCADE;

    -- task_chat_messages
    ALTER TABLE public.task_chat_messages DROP CONSTRAINT IF EXISTS task_chat_messages_task_id_fkey;
    ALTER TABLE public.task_chat_messages ADD CONSTRAINT task_chat_messages_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.workspace_tasks(id) ON DELETE CASCADE;

    -- workspace_tasks parent reference
    ALTER TABLE public.workspace_tasks DROP CONSTRAINT IF EXISTS workspace_tasks_parent_task_id_fkey;
    ALTER TABLE public.workspace_tasks ADD CONSTRAINT workspace_tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.workspace_tasks(id) ON DELETE CASCADE;
END $$;
