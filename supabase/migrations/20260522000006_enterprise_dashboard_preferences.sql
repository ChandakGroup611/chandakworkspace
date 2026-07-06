-- ============================================================================
-- Phase 6 Migration: Enterprise Dashboard Preferences & Personalization
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_dashboard_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    selected_theme TEXT DEFAULT 'executive-light', -- Enum approximation: 'executive-glass', 'tactical-ops', 'enterprise-bento', 'midnight-intel', 'executive-light'
    widget_layout JSONB DEFAULT '{}'::jsonb,
    pinned_analytics JSONB DEFAULT '[]'::jsonb,
    saved_filters JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Enforcement
ALTER TABLE public.user_dashboard_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own dashboard preferences" ON public.user_dashboard_preferences;
DROP POLICY IF EXISTS "Users can manage their own dashboard preferences" ON public.user_dashboard_preferences;
DROP POLICY IF EXISTS "Users can manage their own dashboard preferences" ON public.user_dashboard_preferences;
CREATE POLICY "Users can manage their own dashboard preferences" ON public.user_dashboard_preferences
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Optional: Create trigger to auto-create preference rows for new users,
-- but since we can upsert from the client/server, it's safer to just handle it in the App layer.
