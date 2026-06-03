-- Sprint 5: Statistics Table and Triggers

CREATE TABLE IF NOT EXISTS public.workspace_statistics (
    workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
    subworkspace_count INTEGER DEFAULT 0,
    task_count INTEGER DEFAULT 0,
    subtask_count INTEGER DEFAULT 0,
    member_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Initialize existing workspaces
INSERT INTO public.workspace_statistics (workspace_id)
SELECT id FROM public.workspaces
ON CONFLICT (workspace_id) DO NOTHING;

-- Trigger to create stats row on workspace creation
CREATE OR REPLACE FUNCTION public.create_workspace_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.workspace_statistics (workspace_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_workspace_stats ON public.workspaces;
CREATE TRIGGER trg_create_workspace_stats
AFTER INSERT ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.create_workspace_stats();

-- Trigger for Subworkspace Count
CREATE OR REPLACE FUNCTION public.update_subworkspace_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.parent_workspace_id IS NOT NULL THEN
        UPDATE public.workspace_statistics SET subworkspace_count = subworkspace_count + 1 WHERE workspace_id = NEW.parent_workspace_id;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_workspace_id IS NOT NULL THEN
        UPDATE public.workspace_statistics SET subworkspace_count = subworkspace_count - 1 WHERE workspace_id = OLD.parent_workspace_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_subworkspace_count ON public.workspaces;
CREATE TRIGGER trg_update_subworkspace_count
AFTER INSERT OR DELETE ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.update_subworkspace_count();

-- Trigger for Task Count
CREATE OR REPLACE FUNCTION public.update_task_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.parent_task_id IS NULL THEN
            UPDATE public.workspace_statistics SET task_count = task_count + 1 WHERE workspace_id = NEW.workspace_id;
        ELSE
            UPDATE public.workspace_statistics SET subtask_count = subtask_count + 1 WHERE workspace_id = NEW.workspace_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.parent_task_id IS NULL THEN
            UPDATE public.workspace_statistics SET task_count = task_count - 1 WHERE workspace_id = OLD.workspace_id;
        ELSE
            UPDATE public.workspace_statistics SET subtask_count = subtask_count - 1 WHERE workspace_id = OLD.workspace_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_task_count ON public.tasks;
CREATE TRIGGER trg_update_task_count
AFTER INSERT OR DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_task_count();

-- Trigger for Member Count
CREATE OR REPLACE FUNCTION public.update_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.workspace_statistics SET member_count = member_count + 1 WHERE workspace_id = NEW.workspace_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.workspace_statistics SET member_count = member_count - 1 WHERE workspace_id = OLD.workspace_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_member_count ON public.workspace_members;
CREATE TRIGGER trg_update_member_count
AFTER INSERT OR DELETE ON public.workspace_members
FOR EACH ROW EXECUTE FUNCTION public.update_member_count();

-- Enable RLS and add policies
ALTER TABLE public.workspace_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read statistics"
ON public.workspace_statistics
FOR SELECT
TO authenticated
USING (true);
