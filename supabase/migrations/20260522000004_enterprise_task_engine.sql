-- ============================================================================
-- Phase 4 Migration: Task Engine Schema
-- ============================================================================

-- 1. Core Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    status_id UUID REFERENCES public.status_master(id) NOT NULL,
    priority_id UUID REFERENCES public.priority_master(id) NOT NULL,
    start_date DATE,
    end_date DATE,
    estimated_hours NUMERIC(6,2),
    custom_fields JSONB DEFAULT '{}'::jsonb,
    is_deleted BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- 2. Task Assignments
CREATE TABLE IF NOT EXISTS public.task_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    UNIQUE(task_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.task_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    UNIQUE(task_id, team_id)
);

-- 3. Task Features (Checklists, Watchers, Dependencies)
CREATE TABLE IF NOT EXISTS public.task_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.task_watchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(task_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    depends_on_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    dependency_type TEXT NOT NULL, -- 'BLOCKS', 'BLOCKED_BY', 'RELATED_TO', 'DUPLICATE_OF'
    is_deleted BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    UNIQUE(task_id, depends_on_task_id)
);

-- 4. Dynamic Custom Fields Registry
CREATE TABLE IF NOT EXISTS public.task_custom_fields_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
    field_name TEXT NOT NULL,
    field_key TEXT NOT NULL,
    field_type TEXT NOT NULL, -- 'TEXT', 'TEXTAREA', 'DROPDOWN', 'CHECKBOX', 'NUMBER', 'DATE'
    options JSONB, -- For dropdowns
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, field_key)
);

-- 5. Task Collaboration (Comments, replacing independent chats where necessary, or alongside)
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- 6. Apply Minimal RLS globally
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks Access" ON public.tasks;
CREATE POLICY "tasks Access" ON public.tasks FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_assignees Access" ON public.task_assignees;
CREATE POLICY "task_assignees Access" ON public.task_assignees FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.task_teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_teams Access" ON public.task_teams;
CREATE POLICY "task_teams Access" ON public.task_teams FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_checklists Access" ON public.task_checklists;
CREATE POLICY "task_checklists Access" ON public.task_checklists FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.task_watchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_watchers Access" ON public.task_watchers;
CREATE POLICY "task_watchers Access" ON public.task_watchers FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_dependencies Access" ON public.task_dependencies;
CREATE POLICY "task_dependencies Access" ON public.task_dependencies FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.task_custom_fields_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_custom_fields_master Access" ON public.task_custom_fields_master;
CREATE POLICY "task_custom_fields_master Access" ON public.task_custom_fields_master FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_comments Access" ON public.task_comments;
CREATE POLICY "task_comments Access" ON public.task_comments FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);
