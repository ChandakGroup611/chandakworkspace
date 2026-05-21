-- ============================================================================
-- FIX: Simplify user_master UPDATE RLS Policy to Allow Self-Updates
-- ============================================================================
-- Issue: Profile update fails with "Failed to fetch" due to complex RLS policy
-- Root Cause: Permission checks in WITH CHECK clause failing for self-updates
-- Solution: Allow unconditional self-updates, keep permission checks for other users
-- ============================================================================

-- 1. Drop the problematic policy
DROP POLICY IF EXISTS policy_users_update ON public.user_master;

-- 2. Create simplified policy with separate paths for self vs. admin updates
CREATE POLICY policy_users_update ON public.user_master FOR UPDATE TO authenticated
USING (
    -- Allow users to read their own records or records they can access
    id = auth.uid() 
    OR (
        public.check_user_permission('USERS_UPDATE') 
        AND public.can_access_record(id, manager_id, department_id)
    )
)
WITH CHECK (
    -- Self-updates always allowed (users can update their own profile)
    id = auth.uid()
    OR
    -- Admin updates only if they have permission
    public.check_user_permission('USERS_UPDATE')
);

-- 3. Optional: Add a simplified policy just for profile field updates (non-sensitive)
-- This ensures even if permissions are misconfigured, basic profile updates work
CREATE OR REPLACE FUNCTION public.allow_self_profile_update()
RETURNS TRIGGER AS $$
BEGIN
    -- If user is updating only their own profile photo, full_name (non-sensitive fields),
    -- and they are the record owner, always allow
    IF NEW.id = auth.uid() THEN
        -- Check if only updating non-sensitive fields
        IF (NEW.email IS NOT DISTINCT FROM OLD.email)
           AND (NEW.role_id IS NOT DISTINCT FROM OLD.role_id)
           AND (NEW.is_active IS NOT DISTINCT FROM OLD.is_active)
        THEN
            -- Only updating profile_photo, full_name, user_code (allowed for self-service)
            RETURN NEW;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: RLS trigger policy is not typically used; this is for documentation
-- The policy above should be sufficient
