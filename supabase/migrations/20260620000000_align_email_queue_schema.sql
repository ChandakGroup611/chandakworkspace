-- =================================================================================
-- Migration: Align Email Queue Schema
-- Description: Unifies the `email_queue` table schema to support both the legacy 
--              synchronous SMTP trigger and the new Async Cron Engine.
-- =================================================================================

DO $$
BEGIN
    -- Add the columns required by the new Enterprise Identity Communication migration
    -- We use IF NOT EXISTS to ensure safety if they already exist
    
    ALTER TABLE public.email_queue 
        ADD COLUMN IF NOT EXISTS module VARCHAR(50),
        ADD COLUMN IF NOT EXISTS event VARCHAR(50),
        ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES public.user_master(id),
        ADD COLUMN IF NOT EXISTS html_body TEXT,
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING',
        ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS provider_used UUID REFERENCES public.email_providers(id),
        ADD COLUMN IF NOT EXISTS error_message TEXT,
        ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;
        
    -- Attempt to add body_template if it somehow doesn't exist 
    -- (in case it was dropped or this was a fresh install that skipped legacy)
    ALTER TABLE public.email_queue
        ADD COLUMN IF NOT EXISTS body_template TEXT;

    -- Drop NOT NULL constraints to ensure compatibility with new inserts
    ALTER TABLE public.email_queue ALTER COLUMN body_template DROP NOT NULL;
    
    -- In some older schemas, is_sent was added as NOT NULL
    BEGIN
        ALTER TABLE public.email_queue ALTER COLUMN is_sent DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN
        -- is_sent might not exist, which is fine
    END;

    -- Note: We make html_body and body_template nullable by not adding NOT NULL,
    -- allowing legacy systems to insert body_template without html_body, and vice versa.
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to alter email_queue: %', SQLERRM;
END $$;
