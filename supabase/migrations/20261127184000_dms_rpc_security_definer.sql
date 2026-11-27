-- Fix 42501 "permission denied for table users" when service_role executes fn_dms_* RPCs
-- that insert/update tables with foreign keys referencing auth.users(id).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE 'fn_dms_%'
  LOOP
    EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER SET search_path = public, auth', r.sig);
  END LOOP;
END $$;
