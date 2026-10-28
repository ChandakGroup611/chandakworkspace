-- ==============================================================================
-- Migration: Chandak Meet Enterprise Expansion (Phase 1)
-- Description: Project & Milestone Linking, Realtime Publication, and Indexing
-- ==============================================================================

-- 1. Add project_id and milestone_name to meet_meetings
ALTER TABLE public.meet_meetings
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meet_meetings_project_id ON public.meet_meetings(project_id);

-- 2. Add project_id and milestone_name to meet_points
ALTER TABLE public.meet_points
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS milestone_name TEXT;

CREATE INDEX IF NOT EXISTS idx_meet_points_project_id ON public.meet_points(project_id);

-- 3. Add project_id and milestone_name to meet_tasks
ALTER TABLE public.meet_tasks
    ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS milestone_name TEXT;

CREATE INDEX IF NOT EXISTS idx_meet_tasks_project_id ON public.meet_tasks(project_id);

-- 4. Enable Supabase Realtime for Meet Live Collaboration
DO $$
BEGIN
    -- Check if supabase_realtime publication exists
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.meet_points;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.meet_session_points;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.meet_session_attendees;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.meet_decisions;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.meet_sessions;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.meet_note_blocks;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END IF;
END $$;
