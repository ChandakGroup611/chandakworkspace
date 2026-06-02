-- ============================================================================
-- Phase 3 & 4: Task and Sub-Task Ownership Model
-- ============================================================================

-- 1. Add owner_id to tasks and sub_tasks
ALTER TABLE public.tasks 
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

ALTER TABLE public.sub_tasks 
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Note: The existing `assigned_to` column will be used to automatically populate `owner_id` 
-- at the application layer, or we can mirror it using triggers. 
-- For strict architectural compliance, owner_id represents execution authority.

CREATE OR REPLACE FUNCTION set_task_owner_on_assign()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically mirror assigned_to into owner_id for tasks
    IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to) THEN
        NEW.owner_id := NEW.assigned_to;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_task_owner ON public.tasks;
CREATE TRIGGER trigger_set_task_owner
    BEFORE INSERT OR UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION set_task_owner_on_assign();

DROP TRIGGER IF EXISTS trigger_set_sub_task_owner ON public.sub_tasks;
CREATE TRIGGER trigger_set_sub_task_owner
    BEFORE INSERT OR UPDATE ON public.sub_tasks
    FOR EACH ROW
    EXECUTE FUNCTION set_task_owner_on_assign();


-- 2. Update existing Task Validation Trigger for the Unified Workspace Tree
-- The old trigger assumed `sub_workspace_id`. Since we migrated to a unified adjacency list in Phase 1,
-- all tasks just point to a `workspace_id`. We only need to check if the assignee is a member of that workspace.
CREATE OR REPLACE FUNCTION validate_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_is_valid BOOLEAN;
BEGIN
    IF NEW.assigned_to IS NOT NULL THEN
        -- Task assignee MUST be a member of the exact workspace the task belongs to
        SELECT EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = NEW.workspace_id 
            AND user_id = NEW.assigned_to
            AND is_deleted = false
        ) INTO v_is_valid;

        IF NOT v_is_valid THEN
            RAISE EXCEPTION 'Assignment Violation: Task assignee must be an active member of the corresponding workspace.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Update existing Sub Task Validation Trigger
CREATE OR REPLACE FUNCTION validate_sub_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_task_workspace_id UUID;
    v_is_valid BOOLEAN;
BEGIN
    IF NEW.assigned_to IS NOT NULL THEN
        -- Get the workspace scope of the parent task
        SELECT workspace_id INTO v_task_workspace_id
        FROM public.tasks
        WHERE id = NEW.task_id;

        -- Assignee must be a member of that parent task's workspace
        SELECT EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = v_task_workspace_id 
            AND user_id = NEW.assigned_to
            AND is_deleted = false
        ) INTO v_is_valid;

        IF NOT v_is_valid THEN
            RAISE EXCEPTION 'Assignment Violation: Sub-task assignee must be an active member of the parent task''s workspace.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
