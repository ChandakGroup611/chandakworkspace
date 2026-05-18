-- ============================================================================
-- ADIOS PLATFORM MIGRATION - SESSION TIMESTAMPS
-- ============================================================================

ALTER TABLE public.user_master 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_logout_at TIMESTAMPTZ;
