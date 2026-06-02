-- 20260603000000_sprints_and_templates.sql

-- =========================================================================
-- Sprints & Task Templates schema
-- =========================================================================

-- 1. Sprints Table
CREATE TABLE IF NOT EXISTS public.sprints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    goal TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'PLANNING', -- PLANNING, ACTIVE, CLOSED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Task Templates Table
CREATE TABLE IF NOT EXISTS public.task_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    default_priority_id UUID REFERENCES public.priority_master(id) ON DELETE SET NULL,
    default_tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Alter Tasks Table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES public.sprints(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.task_templates(id) ON DELETE SET NULL;

-- 4. Enable RLS
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Sprints
CREATE POLICY "Users can view sprints in their workspaces" ON public.sprints
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        ) OR
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE workspace_owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage sprints in their workspaces" ON public.sprints
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        ) OR
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE workspace_owner_id = auth.uid()
        )
    );

-- 6. RLS Policies for Task Templates
CREATE POLICY "Users can view templates in their workspaces" ON public.task_templates
    FOR SELECT USING (
        workspace_id IS NULL OR -- global templates
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        ) OR
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE workspace_owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage templates in their workspaces" ON public.task_templates
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        ) OR
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE workspace_owner_id = auth.uid()
        )
    );
