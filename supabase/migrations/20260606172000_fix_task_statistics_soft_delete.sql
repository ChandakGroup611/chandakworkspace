-- Re-define update_task_count function to support UPDATE (soft delete, restore, and hierarchy/workspace movements)
CREATE OR REPLACE FUNCTION public.update_task_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Only count if the new task is NOT deleted
        IF NEW.is_deleted = false THEN
            IF NEW.parent_task_id IS NULL THEN
                UPDATE public.workspace_statistics SET task_count = task_count + 1 WHERE workspace_id = NEW.workspace_id;
            ELSE
                UPDATE public.workspace_statistics SET subtask_count = subtask_count + 1 WHERE workspace_id = NEW.workspace_id;
            END IF;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- Only update if the parent workspace still exists and the old task was NOT deleted
        IF OLD.is_deleted = false AND EXISTS (SELECT 1 FROM public.workspaces WHERE id = OLD.workspace_id) THEN
            IF OLD.parent_task_id IS NULL THEN
                UPDATE public.workspace_statistics SET task_count = GREATEST(0, task_count - 1) WHERE workspace_id = OLD.workspace_id;
            ELSE
                UPDATE public.workspace_statistics SET subtask_count = GREATEST(0, subtask_count - 1) WHERE workspace_id = OLD.workspace_id;
            END IF;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Case A: is_deleted changed (soft delete or restore)
        IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
            -- Soft deleted: decrement old workspace count
            IF EXISTS (SELECT 1 FROM public.workspaces WHERE id = OLD.workspace_id) THEN
                IF OLD.parent_task_id IS NULL THEN
                    UPDATE public.workspace_statistics SET task_count = GREATEST(0, task_count - 1) WHERE workspace_id = OLD.workspace_id;
                ELSE
                    UPDATE public.workspace_statistics SET subtask_count = GREATEST(0, subtask_count - 1) WHERE workspace_id = OLD.workspace_id;
                END IF;
            END IF;
        ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
            -- Restored: increment new workspace count
            IF NEW.parent_task_id IS NULL THEN
                UPDATE public.workspace_statistics SET task_count = task_count + 1 WHERE workspace_id = NEW.workspace_id;
            ELSE
                UPDATE public.workspace_statistics SET subtask_count = subtask_count + 1 WHERE workspace_id = NEW.workspace_id;
            END IF;
        END IF;

        -- Case B: workspace_id or parent_task_id changed (but task is not deleted)
        IF NEW.is_deleted = false AND OLD.is_deleted = false THEN
            IF OLD.workspace_id <> NEW.workspace_id OR (OLD.parent_task_id IS DISTINCT FROM NEW.parent_task_id) THEN
                -- Decrement old count
                IF EXISTS (SELECT 1 FROM public.workspaces WHERE id = OLD.workspace_id) THEN
                    IF OLD.parent_task_id IS NULL THEN
                        UPDATE public.workspace_statistics SET task_count = GREATEST(0, task_count - 1) WHERE workspace_id = OLD.workspace_id;
                    ELSE
                        UPDATE public.workspace_statistics SET subtask_count = GREATEST(0, subtask_count - 1) WHERE workspace_id = OLD.workspace_id;
                    END IF;
                END IF;

                -- Increment new count
                IF NEW.parent_task_id IS NULL THEN
                    UPDATE public.workspace_statistics SET task_count = task_count + 1 WHERE workspace_id = NEW.workspace_id;
                ELSE
                    UPDATE public.workspace_statistics SET subtask_count = subtask_count + 1 WHERE workspace_id = NEW.workspace_id;
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Re-create trigger trg_update_task_count to fire on UPDATE events as well
DROP TRIGGER IF EXISTS trg_update_task_count ON public.tasks;

CREATE TRIGGER trg_update_task_count
AFTER INSERT OR DELETE OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION update_task_count();

-- Run healing query to correct current statistics mismatch
UPDATE public.workspace_statistics ws
SET 
  task_count = (
    SELECT COUNT(*) 
    FROM public.tasks t 
    WHERE t.workspace_id = ws.workspace_id 
      AND t.is_deleted = false 
      AND t.parent_task_id IS NULL
  ),
  subtask_count = (
    SELECT COUNT(*) 
    FROM public.tasks t 
    WHERE t.workspace_id = ws.workspace_id 
      AND t.is_deleted = false 
      AND t.parent_task_id IS NOT NULL
  );
