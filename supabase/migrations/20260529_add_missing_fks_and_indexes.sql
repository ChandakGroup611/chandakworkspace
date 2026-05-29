-- Migration: Add missing foreign keys to tasks table and optimization indexes

DO $$ 
BEGIN

    -- 1. Foreign Key for workspace_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_workspace_id_fkey'
    ) THEN
        ALTER TABLE public.tasks 
        ADD CONSTRAINT tasks_workspace_id_fkey 
        FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
    END IF;

    -- 2. Foreign Key for status_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_status_id_fkey'
    ) THEN
        ALTER TABLE public.tasks 
        ADD CONSTRAINT tasks_status_id_fkey 
        FOREIGN KEY (status_id) REFERENCES public.status_master(id) ON DELETE SET NULL;
    END IF;

    -- 3. Foreign Key for priority_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_priority_id_fkey'
    ) THEN
        ALTER TABLE public.tasks 
        ADD CONSTRAINT tasks_priority_id_fkey 
        FOREIGN KEY (priority_id) REFERENCES public.priority_master(id) ON DELETE SET NULL;
    END IF;

    -- 4. Foreign Key for created_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_created_by_fkey'
    ) THEN
        ALTER TABLE public.tasks 
        ADD CONSTRAINT tasks_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES public.user_master(id) ON DELETE SET NULL;
    END IF;

END $$;

-- 5. Add composite index on workspace_members if missing
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_workspace 
ON public.workspace_members (user_id, workspace_id) WHERE is_deleted = false;

-- 6. Add index on tasks
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id_deleted 
ON public.tasks (workspace_id) WHERE is_deleted = false;
