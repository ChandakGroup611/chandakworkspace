-- ============================================================================
-- Phase 2: Strict Membership Inheritance Model
-- ============================================================================

-- 1. Create the validator function
CREATE OR REPLACE FUNCTION validate_workspace_member_inheritance()
RETURNS TRIGGER AS $$
DECLARE
    v_parent_workspace_id UUID;
    v_is_parent_member BOOLEAN;
BEGIN
    -- Get the parent_workspace_id of the target workspace
    SELECT parent_workspace_id INTO v_parent_workspace_id
    FROM public.workspaces
    WHERE id = NEW.workspace_id;

    -- If this is a Root Workspace (no parent), any user can be added.
    IF v_parent_workspace_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- If it's a Child Workspace, the user MUST exist in the parent workspace's members.
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = v_parent_workspace_id 
        AND user_id = NEW.user_id
        AND is_deleted = false
    ) INTO v_is_parent_member;

    IF NOT v_is_parent_member THEN
        RAISE EXCEPTION 'Membership Violation: User must be an active member of the parent workspace before they can be added to this child workspace.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger to workspace_members
DROP TRIGGER IF EXISTS trigger_validate_workspace_member_inheritance ON public.workspace_members;
CREATE TRIGGER trigger_validate_workspace_member_inheritance
    BEFORE INSERT OR UPDATE ON public.workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION validate_workspace_member_inheritance();
