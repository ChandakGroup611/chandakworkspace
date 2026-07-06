-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Software AMC Audit Logging
-- ============================================================================

-- 1. Create the Audit Log Table
CREATE TABLE IF NOT EXISTS public.software_amc_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amc_id UUID NOT NULL,
    actor_id UUID, -- Can be NULL if modified by system processes
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    before_values JSONB,
    after_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add Foreign Key (without cascading so we preserve history even if AMC is hard-deleted, though we use soft-delete usually)
-- Actually, since we want immutable history, we don't CASCADE DELETE from software_amc.
-- If we want to ensure data integrity, we can optionally link it. 
-- For audit logs, it's safer NOT to have a strict foreign key so we retain logs of deleted records.

CREATE INDEX IF NOT EXISTS idx_software_amc_audit_logs_amc_id ON public.software_amc_audit_logs(amc_id);
CREATE INDEX IF NOT EXISTS idx_software_amc_audit_logs_created_at ON public.software_amc_audit_logs(created_at DESC);

-- 3. Create Trigger Function
CREATE OR REPLACE FUNCTION public.handle_software_amc_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_actor_id UUID;
    v_operation TEXT;
    v_before JSONB := NULL;
    v_after JSONB := NULL;
    v_amc_id UUID;
BEGIN
    -- Determine the actor (user making the change)
    v_actor_id := auth.uid();
    
    -- Determine operation and records
    IF TG_OP = 'INSERT' THEN
        v_operation := 'INSERT';
        v_after := to_jsonb(NEW);
        v_amc_id := NEW.id;
    ELSIF TG_OP = 'UPDATE' THEN
        v_operation := 'UPDATE';
        v_before := to_jsonb(OLD);
        v_after := to_jsonb(NEW);
        v_amc_id := NEW.id;
        
        -- Optional optimization: Don't log if nothing actually changed
        IF v_before = v_after THEN
            RETURN NEW;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        v_operation := 'DELETE';
        v_before := to_jsonb(OLD);
        v_amc_id := OLD.id;
    END IF;

    -- Insert into audit log
    INSERT INTO public.software_amc_audit_logs (
        amc_id, 
        actor_id, 
        operation, 
        before_values, 
        after_values
    ) VALUES (
        v_amc_id, 
        v_actor_id, 
        v_operation, 
        v_before, 
        v_after
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$function$;

-- 4. Apply Trigger to `software_amc`
DROP TRIGGER IF EXISTS trg_software_amc_audit ON public.software_amc;
CREATE TRIGGER trg_software_amc_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.software_amc
    FOR EACH ROW EXECUTE FUNCTION public.handle_software_amc_audit();

-- 5. Row Level Security for Audit Logs
ALTER TABLE public.software_amc_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view logs (we can restrict this to admins later using a more complex policy if needed)
-- For now, they are read-only for authenticated users.
DROP POLICY IF EXISTS policy_amc_audit_logs_select ON public.software_amc_audit_logs;
CREATE POLICY policy_amc_audit_logs_select ON public.software_amc_audit_logs 
    FOR SELECT TO authenticated 
    USING (true);

-- No INSERT, UPDATE, or DELETE policies - table is read-only from the frontend API.
-- (The trigger runs with SECURITY DEFINER, so it bypasses RLS and can insert logs safely).
