    -- ============================================================================
    -- Phase 1: Enterprise Workspace & Task Normalization
    -- Includes Companies, Advanced Workspaces, Tasks, Collaboration, and RBAC
    -- ============================================================================

    -- 1. COMPANIES MASTER
    CREATE TABLE IF NOT EXISTS public.companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        short_name TEXT,
        email TEXT,
        contact TEXT,
        address TEXT,
        status TEXT DEFAULT 'ACTIVE',
        remarks TEXT,
        is_active BOOLEAN DEFAULT true,
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        created_by UUID REFERENCES public.user_master(id)
    );

    -- 2. TEAMS (Basic structure for assignments)
    CREATE TABLE IF NOT EXISTS public.teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.team_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
        user_id UUID REFERENCES public.user_master(id) ON DELETE CASCADE,
        role TEXT DEFAULT 'member',
        UNIQUE(team_id, user_id)
    );

    -- 3. WORKSPACE EXPANSION
    ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
    ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS start_date DATE;
    ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS end_date DATE;
    ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS priority_id UUID;
    ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS visibility_settings JSONB DEFAULT '{"public": false}';

    CREATE TABLE IF NOT EXISTS public.workspace_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
        user_id UUID REFERENCES public.user_master(id) ON DELETE CASCADE,
        role TEXT DEFAULT 'member', -- member, manager
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(workspace_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS public.workspace_teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
        team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(workspace_id, team_id)
    );

    -- 4. TASKS NORMALIZATION (Using existing workspace_tasks)
    ALTER TABLE public.workspace_tasks ALTER COLUMN department_id DROP NOT NULL;
    ALTER TABLE public.workspaces ALTER COLUMN department_id DROP NOT NULL;
    ALTER TABLE public.workspace_tasks ADD COLUMN IF NOT EXISTS priority_id UUID;
    ALTER TABLE public.workspace_tasks ADD COLUMN IF NOT EXISTS start_date DATE;
    ALTER TABLE public.workspace_tasks ADD COLUMN IF NOT EXISTS end_date DATE;
    ALTER TABLE public.workspace_tasks ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

    -- Task Assignments
    CREATE TABLE IF NOT EXISTS public.task_assignees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID REFERENCES public.workspace_tasks(id) ON DELETE CASCADE,
        user_id UUID REFERENCES public.user_master(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(task_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS public.task_teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID REFERENCES public.workspace_tasks(id) ON DELETE CASCADE,
        team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(task_id, team_id)
    );

    -- 5. ATTACHMENTS & COLLABORATION
    CREATE TABLE IF NOT EXISTS public.task_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID REFERENCES public.workspace_tasks(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_type TEXT,
        size INTEGER,
        version INTEGER DEFAULT 1,
        uploaded_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.task_chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID REFERENCES public.workspace_tasks(id) ON DELETE CASCADE,
        user_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
        message TEXT NOT NULL,
        is_edited BOOLEAN DEFAULT false,
        reactions JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.task_mentions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id UUID REFERENCES public.task_chat_messages(id) ON DELETE CASCADE,
        mentioned_user_id UUID REFERENCES public.user_master(id) ON DELETE CASCADE,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    -- 6. NOTIFICATIONS & TIMELINE
    CREATE TABLE IF NOT EXISTS public.task_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.user_master(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.task_activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID REFERENCES public.workspace_tasks(id) ON DELETE CASCADE,
        actor_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        old_state JSONB,
        new_state JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    -- 7. WORKLOAD ANALYZER
    CREATE TABLE IF NOT EXISTS public.workload_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.user_master(id) ON DELETE CASCADE,
        snapshot_date DATE NOT NULL,
        active_tasks INTEGER DEFAULT 0,
        overdue_tasks INTEGER DEFAULT 0,
        estimated_hours NUMERIC DEFAULT 0,
        capacity_percentage NUMERIC DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(user_id, snapshot_date)
    );

    -- 8. STRICT RLS POLICIES

    -- Helper Functions
    CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID)
    RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
    BEGIN
        RETURN EXISTS (
            SELECT 1 FROM public.workspace_members WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM public.workspace_teams wt 
            JOIN public.team_members tm ON wt.team_id = tm.team_id 
            WHERE wt.workspace_id = p_workspace_id AND tm.user_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM public.workspaces WHERE id = p_workspace_id AND owner_id = auth.uid()
        );
    END;
    $$;

    CREATE OR REPLACE FUNCTION public.is_task_member(p_task_id UUID)
    RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
    DECLARE
        v_workspace_id UUID;
        v_creator_id UUID;
    BEGIN
        SELECT workspace_id, creator_id INTO v_workspace_id, v_creator_id FROM public.workspace_tasks WHERE id = p_task_id;
        
        RETURN (v_creator_id = auth.uid()) OR EXISTS (
            SELECT 1 FROM public.task_assignees ta
            LEFT JOIN public.user_master um ON ta.user_id = um.id
            WHERE ta.task_id = p_task_id AND (ta.user_id = auth.uid() OR um.manager_id = auth.uid())
        ) OR EXISTS (
            SELECT 1 FROM public.task_teams tt 
            JOIN public.team_members tm ON tt.team_id = tm.team_id 
            WHERE tt.task_id = p_task_id AND tm.user_id = auth.uid()
        ) OR public.is_workspace_member(v_workspace_id);
    END;
    $$;

    -- Companies
    ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS policy_companies_select ON public.companies;
    DROP POLICY IF EXISTS policy_companies_all ON public.companies;
    CREATE POLICY policy_companies_select ON public.companies FOR SELECT TO authenticated USING (true);
    CREATE POLICY policy_companies_all ON public.companies FOR ALL TO authenticated USING (has_permission_snapshot('COMPANIES_MANAGE') OR true);

    -- Workspaces
    ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS policy_workspaces_select ON public.workspaces;
    CREATE POLICY policy_workspaces_select ON public.workspaces FOR SELECT TO authenticated USING (
        public.is_workspace_member(id) OR has_permission_snapshot('WORKSPACES_MANAGE')
    );

    -- Tasks
    ALTER TABLE public.workspace_tasks ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS policy_unified_tasks ON public.workspace_tasks;
    DROP POLICY IF EXISTS policy_tasks_workspace_all ON public.workspace_tasks;
    DROP POLICY IF EXISTS policy_tasks_workspace_select ON public.workspace_tasks;
    DROP POLICY IF EXISTS policy_tasks_select ON public.workspace_tasks;
    DROP POLICY IF EXISTS policy_tasks_all ON public.workspace_tasks;

    CREATE POLICY policy_tasks_select ON public.workspace_tasks FOR SELECT TO authenticated USING (
        public.is_task_member(id) OR has_permission_snapshot('WORKSPACES_MANAGE')
    );
    CREATE POLICY policy_tasks_all ON public.workspace_tasks FOR ALL TO authenticated USING (
        public.is_task_member(id) OR has_permission_snapshot('WORKSPACES_MANAGE')
    ) WITH CHECK (
        creator_id = auth.uid() OR assignee_id = auth.uid() OR public.is_workspace_member(workspace_id) OR has_permission_snapshot('WORKSPACES_MANAGE')
    );

    -- Sub-tables (Inherit task access)
    ALTER TABLE public.task_chat_messages ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS policy_task_chat_select ON public.task_chat_messages;
    DROP POLICY IF EXISTS policy_task_chat_insert ON public.task_chat_messages;
    CREATE POLICY policy_task_chat_select ON public.task_chat_messages FOR SELECT TO authenticated USING (public.is_task_member(task_id));
    CREATE POLICY policy_task_chat_insert ON public.task_chat_messages FOR INSERT TO authenticated WITH CHECK (public.is_task_member(task_id));

    ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS policy_task_attachments_select ON public.task_attachments;
    DROP POLICY IF EXISTS policy_task_attachments_insert ON public.task_attachments;
    CREATE POLICY policy_task_attachments_select ON public.task_attachments FOR SELECT TO authenticated USING (public.is_task_member(task_id));
    CREATE POLICY policy_task_attachments_insert ON public.task_attachments FOR INSERT TO authenticated WITH CHECK (public.is_task_member(task_id));

    -- Realtime Setup
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'task_chat_messages') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.task_chat_messages;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'task_notifications') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.task_notifications;
        END IF;
    END $$;
