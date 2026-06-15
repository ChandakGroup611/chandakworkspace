-- ============================================================================
-- PHASE C3.6: BREAK GLASS IMPLEMENTATION
-- Creates the emergency access role and immutable audit logging path.
-- ============================================================================

-- 1. Create Break Glass Role
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'break_glass_role') THEN
    CREATE ROLE break_glass_role NOLOGIN;
  END IF;
END
$$;

-- 2. Create emergency audit logging function
CREATE OR REPLACE FUNCTION public.log_break_glass_action(p_action TEXT, p_details JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.activity_events (
    module_type, record_id, event_type, old_value, new_value, performed_by
  ) VALUES (
    'SYSTEM', auth.uid(), 'EMERGENCY_OVERRIDE', null, p_details, auth.uid()
  );
END;
$$;
