-- ============================================================================
-- Enterprise Authorization & Reporting Refactor
-- Phase 1 & 2 & 3: Schema Updates
-- ============================================================================

-- 1. Delete existing workspace and task data as approved
TRUNCATE TABLE public.workspaces CASCADE;

-- Drop obsolete assignments tables if they exist
DROP TABLE IF EXISTS public.task_assignees CASCADE;

-- 2. Sub Workspaces
CREATE TABLE IF NOT EXISTS public.sub_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.sub_workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_workspace_id UUID REFERENCES public.sub_workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(sub_workspace_id, user_id)
);

-- 3. Modify Tasks Table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sub_workspace_id UUID REFERENCES public.sub_workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- 4. Sub Tasks
CREATE TABLE IF NOT EXISTS public.sub_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'OPEN',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false
);

-- 5. Trigger: Validate Sub Workspace Member is a Workspace Member
CREATE OR REPLACE FUNCTION validate_sub_workspace_member()
RETURNS TRIGGER AS $$
DECLARE
    v_workspace_id UUID;
    v_is_workspace_member BOOLEAN;
BEGIN
    -- Get the parent workspace ID
    SELECT workspace_id INTO v_workspace_id
    FROM public.sub_workspaces
    WHERE id = NEW.sub_workspace_id;

    -- Check if user is a member of the parent workspace
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = v_workspace_id AND user_id = NEW.user_id
    ) INTO v_is_workspace_member;

    IF NOT v_is_workspace_member THEN
        RAISE EXCEPTION 'User must be a member of the parent workspace to be added to the sub workspace.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_validate_sub_workspace_member ON public.sub_workspace_members;
CREATE TRIGGER trigger_validate_sub_workspace_member
    BEFORE INSERT OR UPDATE ON public.sub_workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION validate_sub_workspace_member();

-- 6. Trigger: Validate Task Assignment Scope
CREATE OR REPLACE FUNCTION validate_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_is_valid BOOLEAN;
BEGIN
    IF NEW.assigned_to IS NOT NULL THEN
        IF NEW.sub_workspace_id IS NOT NULL THEN
            -- Must be Sub Workspace Member
            SELECT EXISTS (
                SELECT 1 FROM public.sub_workspace_members
                WHERE sub_workspace_id = NEW.sub_workspace_id AND user_id = NEW.assigned_to
            ) INTO v_is_valid;
        ELSE
            -- Must be Workspace Member
            SELECT EXISTS (
                SELECT 1 FROM public.workspace_members
                WHERE workspace_id = NEW.workspace_id AND user_id = NEW.assigned_to
            ) INTO v_is_valid;
        END IF;

        IF NOT v_is_valid THEN
            RAISE EXCEPTION 'Task assignee must be a valid member of the corresponding workspace scope.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_validate_task_assignment ON public.tasks;
CREATE TRIGGER trigger_validate_task_assignment
    BEFORE INSERT OR UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION validate_task_assignment();

-- 7. Trigger: Validate Sub Task Assignment Scope
CREATE OR REPLACE FUNCTION validate_sub_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_task_workspace_id UUID;
    v_task_sub_workspace_id UUID;
    v_is_valid BOOLEAN;
BEGIN
    IF NEW.assigned_to IS NOT NULL THEN
        -- Get Task Scopes
        SELECT workspace_id, sub_workspace_id INTO v_task_workspace_id, v_task_sub_workspace_id
        FROM public.tasks
        WHERE id = NEW.task_id;

        IF v_task_sub_workspace_id IS NOT NULL THEN
            -- Must be Sub Workspace Member
            SELECT EXISTS (
                SELECT 1 FROM public.sub_workspace_members
                WHERE sub_workspace_id = v_task_sub_workspace_id AND user_id = NEW.assigned_to
            ) INTO v_is_valid;
        ELSE
            -- Must be Workspace Member
            SELECT EXISTS (
                SELECT 1 FROM public.workspace_members
                WHERE workspace_id = v_task_workspace_id AND user_id = NEW.assigned_to
            ) INTO v_is_valid;
        END IF;

        IF NOT v_is_valid THEN
            RAISE EXCEPTION 'Sub Task assignee must be a valid member of the corresponding workspace scope.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_validate_sub_task_assignment ON public.sub_tasks;
CREATE TRIGGER trigger_validate_sub_task_assignment
    BEFORE INSERT OR UPDATE ON public.sub_tasks
    FOR EACH ROW
    EXECUTE FUNCTION validate_sub_task_assignment();

-- 8. Basic RLS for Visibility (Read-Only)
-- Visibility != Edit Rights (as per spec, edit rights handled in backend)
ALTER TABLE public.sub_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_tasks ENABLE ROW LEVEL SECURITY;

-- Sub Workspaces Visibility: Only if workspace member
DROP POLICY IF EXISTS "sub_workspaces_visibility" ON public.sub_workspaces;
DROP POLICY IF EXISTS "sub_workspaces_visibility" ON public.sub_workspaces;
DROP POLICY IF EXISTS "sub_workspaces_visibility" ON public.sub_workspaces;
CREATE POLICY "sub_workspaces_visibility" ON public.sub_workspaces FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.workspace_members 
        WHERE workspace_members.workspace_id = sub_workspaces.workspace_id 
        AND workspace_members.user_id = auth.uid()
    ) OR has_permission_snapshot('SUPER_ADMIN')
);

-- Sub Workspace Members Visibility
DROP POLICY IF EXISTS "sub_workspace_members_visibility" ON public.sub_workspace_members;
DROP POLICY IF EXISTS "sub_workspace_members_visibility" ON public.sub_workspace_members;
DROP POLICY IF EXISTS "sub_workspace_members_visibility" ON public.sub_workspace_members;
CREATE POLICY "sub_workspace_members_visibility" ON public.sub_workspace_members FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.sub_workspaces sw
        JOIN public.workspace_members wm ON sw.workspace_id = wm.workspace_id
        WHERE sw.id = sub_workspace_members.sub_workspace_id AND wm.user_id = auth.uid()
    ) OR has_permission_snapshot('SUPER_ADMIN')
);

-- Tasks Visibility Enhancements (Workspace + Sub Workspace)
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.workspace_members 
        WHERE workspace_members.workspace_id = tasks.workspace_id 
        AND workspace_members.user_id = auth.uid()
    ) OR has_permission_snapshot('SUPER_ADMIN')
);

-- Sub Tasks Visibility
DROP POLICY IF EXISTS "sub_tasks_select" ON public.sub_tasks;
DROP POLICY IF EXISTS "sub_tasks_select" ON public.sub_tasks;
DROP POLICY IF EXISTS "sub_tasks_select" ON public.sub_tasks;
CREATE POLICY "sub_tasks_select" ON public.sub_tasks FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.workspace_members wm ON t.workspace_id = wm.workspace_id
        WHERE t.id = sub_tasks.task_id AND wm.user_id = auth.uid()
    ) OR has_permission_snapshot('SUPER_ADMIN')
);

-- Note: All non-SELECT operations will be controlled by backend/RPCs bypassing RLS or by explicit policies if required.
-- However, for the frontend to work, we might need basic INSERT/UPDATE policies restricted by backend logic,
-- but the spec says "Editing rights should be enforced through Backend Authorization Layer".
-- We'll allow all modifications in RLS if they are the owner, to be safe, or just rely on backend.
-- "DO NOT build task-owner visibility RLS. Visibility should remain Workspace Scope... Editing rights should be enforced through Backend Authorization Layer + Permission Middleware + Service Layer"
-- So we won't add UPDATE/INSERT policies here if they use service_role for updates, OR we just allow it if they are members.
