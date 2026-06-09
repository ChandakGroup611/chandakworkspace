-- Create the active sessions table
CREATE TABLE IF NOT EXISTS public.active_sessions (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token UUID NOT NULL,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id)
);

-- Enable RLS
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies (only users can access their own session tracking)
CREATE POLICY policy_active_sessions_select ON public.active_sessions 
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY policy_active_sessions_insert ON public.active_sessions 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY policy_active_sessions_update ON public.active_sessions 
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY policy_active_sessions_delete ON public.active_sessions 
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable Realtime for the table so we get instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;
