-- ============================================================================
-- ADIOS PLATFORM: Add missing user_master foreign key relationships and repair notification_queue schema
-- ============================================================================

-- Part 1: Repair user_master Foreign Keys
-- Clean up orphaned references if any exist to ensure safe constraint addition
UPDATE public.user_master
SET department_id = NULL
WHERE department_id IS NOT NULL 
  AND department_id NOT IN (SELECT id FROM public.departments);

UPDATE public.user_master
SET designation_id = NULL
WHERE designation_id IS NOT NULL 
  AND designation_id NOT IN (SELECT id FROM public.designations);

UPDATE public.user_master
SET role_id = NULL
WHERE role_id IS NOT NULL 
  AND role_id NOT IN (SELECT id FROM public.roles);

-- Add foreign key constraints back to user_master
ALTER TABLE public.user_master
    DROP CONSTRAINT IF EXISTS fk_user_master_department,
    DROP CONSTRAINT IF EXISTS fk_user_master_designation,
    DROP CONSTRAINT IF EXISTS fk_user_master_role;

ALTER TABLE public.user_master
    ADD CONSTRAINT fk_user_master_department 
    FOREIGN KEY (department_id) 
    REFERENCES public.departments(id) 
    ON DELETE SET NULL;

ALTER TABLE public.user_master
    ADD CONSTRAINT fk_user_master_designation 
    FOREIGN KEY (designation_id) 
    REFERENCES public.designations(id) 
    ON DELETE SET NULL;

ALTER TABLE public.user_master
    ADD CONSTRAINT fk_user_master_role 
    FOREIGN KEY (role_id) 
    REFERENCES public.roles(id) 
    ON DELETE SET NULL;


-- Part 2: Repair notification_queue Schema & Setup Compatibility Sync
-- Add missing columns to notification_queue if they don't exist
ALTER TABLE public.notification_queue 
    ADD COLUMN IF NOT EXISTS entity_type TEXT,
    ADD COLUMN IF NOT EXISTS entity_id TEXT,
    ADD COLUMN IF NOT EXISTS module TEXT DEFAULT 'tickets',
    ADD COLUMN IF NOT EXISTS action_type TEXT,
    ADD COLUMN IF NOT EXISTS actor TEXT,
    ADD COLUMN IF NOT EXISTS target_user_id TEXT,
    ADD COLUMN IF NOT EXISTS redirect_url TEXT,
    ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'MEDIUM';

-- Make recipient_id nullable to support global broadcast notifications (e.g., target_user_id = 'GLOBAL_OPS')
ALTER TABLE public.notification_queue 
    ALTER COLUMN recipient_id DROP NOT NULL;

-- Define BEFORE INSERT trigger to sync fields and handle payload extraction
CREATE OR REPLACE FUNCTION public.tr_sync_notification_queue_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract values from JSONB payload if they are not directly provided
    IF NEW.payload IS NOT NULL THEN
        NEW.entity_id := COALESCE(NEW.entity_id, NEW.payload ->> 'code', NEW.payload ->> 'ticket_id');
        NEW.action_type := COALESCE(NEW.action_type, NEW.payload ->> 'type');
        NEW.actor := COALESCE(NEW.actor, NEW.payload ->> 'actor', 'System');
        
        -- Infer redirect url if not provided
        IF NEW.redirect_url IS NULL AND NEW.payload ->> 'ticket_id' IS NOT NULL THEN
            NEW.redirect_url := '/tickets?id=' || (NEW.payload ->> 'ticket_id');
        END IF;
    END IF;

    -- Defaults
    NEW.entity_type := COALESCE(NEW.entity_type, 'ticket');
    NEW.module := COALESCE(NEW.module, 'tickets');
    NEW.action_type := COALESCE(NEW.action_type, 'mutate');
    NEW.actor := COALESCE(NEW.actor, 'System');
    NEW.redirect_url := COALESCE(NEW.redirect_url, '/');
    NEW.priority_level := COALESCE(NEW.priority_level, 'MEDIUM');

    -- Sync recipient_id to target_user_id if needed
    IF NEW.target_user_id IS NULL AND NEW.recipient_id IS NOT NULL THEN
        NEW.target_user_id := NEW.recipient_id::text;
    END IF;

    -- Sync target_user_id to recipient_id if it's a valid UUID
    IF NEW.recipient_id IS NULL AND NEW.target_user_id IS NOT NULL THEN
        BEGIN
            NEW.recipient_id := NEW.target_user_id::uuid;
        EXCEPTION WHEN others THEN
            -- If it's a code like 'GLOBAL_OPS', leave recipient_id as NULL
            NEW.recipient_id := NULL;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_notification_queue_sync ON public.notification_queue;
CREATE TRIGGER tr_notification_queue_sync
    BEFORE INSERT ON public.notification_queue
    FOR EACH ROW
    EXECUTE FUNCTION public.tr_sync_notification_queue_fields();
