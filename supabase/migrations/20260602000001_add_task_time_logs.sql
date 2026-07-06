-- Create task time logs table
CREATE TABLE IF NOT EXISTS public.task_time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_master(id) ON DELETE CASCADE,
    hours NUMERIC(5, 2) NOT NULL,
    description TEXT,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.task_time_logs ENABLE ROW LEVEL SECURITY;

-- Policies for task_time_logs
DROP POLICY IF EXISTS "Users can view time logs for tasks they can access" ON public.task_time_logs;
DROP POLICY IF EXISTS "Users can view time logs for tasks they can access" ON public.task_time_logs;
CREATE POLICY "Users can view time logs for tasks they can access" ON public.task_time_logs FOR SELECT
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

DROP POLICY IF EXISTS "Users can insert time logs for tasks they can access" ON public.task_time_logs;
DROP POLICY IF EXISTS "Users can insert time logs for tasks they can access" ON public.task_time_logs;
CREATE POLICY "Users can insert time logs for tasks they can access" ON public.task_time_logs FOR INSERT
    WITH CHECK (
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

DROP POLICY IF EXISTS "Users can edit their own time logs" ON public.task_time_logs;
DROP POLICY IF EXISTS "Users can edit their own time logs" ON public.task_time_logs;
CREATE POLICY "Users can edit their own time logs" ON public.task_time_logs FOR UPDATE
    USING (
        user_id = auth.uid()
        OR 
        EXISTS (
            SELECT 1 FROM public.user_permissions_snapshot 
            WHERE user_id = auth.uid() AND permission_code IN ('SUPER_ADMIN', 'WORKSPACES_MANAGE')
        )
    );

DROP POLICY IF EXISTS "Users can delete their own time logs" ON public.task_time_logs;
DROP POLICY IF EXISTS "Users can delete their own time logs" ON public.task_time_logs;
CREATE POLICY "Users can delete their own time logs" ON public.task_time_logs FOR DELETE
    USING (
        user_id = auth.uid()
        OR 
        EXISTS (
            SELECT 1 FROM public.user_permissions_snapshot 
            WHERE user_id = auth.uid() AND permission_code IN ('SUPER_ADMIN', 'WORKSPACES_MANAGE')
        )
    );
