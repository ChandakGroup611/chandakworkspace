-- Create task tags table
CREATE TABLE IF NOT EXISTS public.task_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#9333ea',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(workspace_id, name)
);

-- Enable RLS
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;

-- Policies for task_tags
DROP POLICY IF EXISTS "Users can view tags for their workspaces" ON public.task_tags;
DROP POLICY IF EXISTS "Users can view tags for their workspaces" ON public.task_tags;
CREATE POLICY "Users can view tags for their workspaces" ON public.task_tags FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND is_deleted = false
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.user_permissions_snapshot 
            WHERE user_id = auth.uid() AND permission_code IN ('SUPER_ADMIN', 'WORKSPACES_VIEW')
        )
    );

DROP POLICY IF EXISTS "Users can insert tags for their workspaces" ON public.task_tags;
DROP POLICY IF EXISTS "Users can insert tags for their workspaces" ON public.task_tags;
CREATE POLICY "Users can insert tags for their workspaces" ON public.task_tags FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND is_deleted = false
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.user_permissions_snapshot 
            WHERE user_id = auth.uid() AND permission_code IN ('SUPER_ADMIN', 'WORKSPACES_MANAGE')
        )
    );

-- Create task tag mappings table
CREATE TABLE IF NOT EXISTS public.task_tag_mappings (
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.task_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (task_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.task_tag_mappings ENABLE ROW LEVEL SECURITY;

-- Policies for task_tag_mappings
DROP POLICY IF EXISTS "Users can view tag mappings for their tasks" ON public.task_tag_mappings;
DROP POLICY IF EXISTS "Users can view tag mappings for their tasks" ON public.task_tag_mappings;
CREATE POLICY "Users can view tag mappings for their tasks" ON public.task_tag_mappings FOR SELECT
    USING (
        task_id IN (
            SELECT id FROM public.tasks WHERE workspace_id IN (
                SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND is_deleted = false
            )
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.user_permissions_snapshot 
            WHERE user_id = auth.uid() AND permission_code IN ('SUPER_ADMIN', 'WORKSPACES_VIEW')
        )
    );

DROP POLICY IF EXISTS "Users can insert tag mappings for their tasks" ON public.task_tag_mappings;
DROP POLICY IF EXISTS "Users can insert tag mappings for their tasks" ON public.task_tag_mappings;
CREATE POLICY "Users can insert tag mappings for their tasks" ON public.task_tag_mappings FOR INSERT
    WITH CHECK (
        task_id IN (
            SELECT id FROM public.tasks WHERE workspace_id IN (
                SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND is_deleted = false
            )
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.user_permissions_snapshot 
            WHERE user_id = auth.uid() AND permission_code IN ('SUPER_ADMIN', 'WORKSPACES_MANAGE')
        )
    );

DROP POLICY IF EXISTS "Users can delete tag mappings for their tasks" ON public.task_tag_mappings;
DROP POLICY IF EXISTS "Users can delete tag mappings for their tasks" ON public.task_tag_mappings;
CREATE POLICY "Users can delete tag mappings for their tasks" ON public.task_tag_mappings FOR DELETE
    USING (
        task_id IN (
            SELECT id FROM public.tasks WHERE workspace_id IN (
                SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND is_deleted = false
            )
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.user_permissions_snapshot 
            WHERE user_id = auth.uid() AND permission_code IN ('SUPER_ADMIN', 'WORKSPACES_MANAGE')
        )
    );
