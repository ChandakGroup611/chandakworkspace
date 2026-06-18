-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Fix User Role Synchronization Trigger Null-Safety
-- Purpose: Ensures that clearing a user's role (setting role_id to NULL) 
--          does not wipe out other keys in their auth.users app_metadata.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_user_role_to_auth()
RETURNS TRIGGER AS $$
DECLARE
    v_role_code TEXT;
BEGIN
    -- Enforce search path for security definer function safety
    SET search_path = public;

    SELECT code INTO v_role_code FROM public.roles WHERE id = NEW.role_id;
    
    IF v_role_code IS NOT NULL THEN
        UPDATE auth.users 
        SET raw_app_metadata = jsonb_set(COALESCE(raw_app_metadata, '{}'::jsonb), '{role}', to_jsonb(v_role_code))
        WHERE id = NEW.id;
    ELSE
        -- Gracefully strip the 'role' key if it is cleared, preventing metadata from becoming NULL
        UPDATE auth.users 
        SET raw_app_metadata = COALESCE(raw_app_metadata, '{}'::jsonb) - 'role'
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
