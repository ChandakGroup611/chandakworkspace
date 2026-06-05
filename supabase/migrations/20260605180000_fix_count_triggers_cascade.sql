-- 20260605180000_fix_count_triggers_cascade.sql

CREATE OR REPLACE FUNCTION public.update_subworkspace_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.parent_workspace_id IS NOT NULL THEN
        UPDATE public.workspace_statistics 
        SET subworkspace_count = subworkspace_count + 1 
        WHERE workspace_id = NEW.parent_workspace_id;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_workspace_id IS NOT NULL THEN
        -- Only update if the parent workspace still exists (prevents FK errors during cascade deletes)
        IF EXISTS (SELECT 1 FROM public.workspaces WHERE id = OLD.parent_workspace_id) THEN
            UPDATE public.workspace_statistics 
            SET subworkspace_count = GREATEST(0, subworkspace_count - 1) 
            WHERE workspace_id = OLD.parent_workspace_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_task_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.parent_task_id IS NULL THEN
            UPDATE public.workspace_statistics SET task_count = task_count + 1 WHERE workspace_id = NEW.workspace_id;
        ELSE
            UPDATE public.workspace_statistics SET subtask_count = subtask_count + 1 WHERE workspace_id = NEW.workspace_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- Only update if the parent workspace still exists (prevents FK errors during cascade deletes)
        IF EXISTS (SELECT 1 FROM public.workspaces WHERE id = OLD.workspace_id) THEN
            IF OLD.parent_task_id IS NULL THEN
                UPDATE public.workspace_statistics SET task_count = GREATEST(0, task_count - 1) WHERE workspace_id = OLD.workspace_id;
            ELSE
                UPDATE public.workspace_statistics SET subtask_count = GREATEST(0, subtask_count - 1) WHERE workspace_id = OLD.workspace_id;
            END IF;
        END IF;
    END IF;
    RETURN NULL;
END;
$function$;
