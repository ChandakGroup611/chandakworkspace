-- This RPC consolidates multiple count queries into a single database hit for the Sidebar.
-- It avoids JOINs and ORDER BY clauses to remain ultra-lightweight.

CREATE OR REPLACE FUNCTION get_sidebar_counts()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ticket_count int;
  workspace_count int;
  requirement_count int;
  sla_count int;
  user_count int;
BEGIN
  -- Count active tickets
  SELECT count(*) INTO ticket_count FROM tickets WHERE is_deleted = false;
  
  -- Count active workspaces
  SELECT count(*) INTO workspace_count FROM workspaces WHERE is_deleted = false;
  
  -- Count active requirements
  SELECT count(*) INTO requirement_count FROM requirements WHERE is_deleted = false;
  
  -- Count active SLAs (Assuming active means is_deleted = false)
  SELECT count(*) INTO sla_count FROM slas WHERE is_deleted = false;
  
  -- Count active users
  SELECT count(*) INTO user_count FROM user_master WHERE is_active = true AND is_deleted = false;
  
  RETURN json_build_object(
    'tickets', ticket_count,
    'workspaces', workspace_count,
    'requirements', requirement_count,
    'sla', sla_count,
    'users', user_count
  );
END;
$$;

-- Note: Ensure that partial indexes exist on these tables to optimize these counts
-- e.g. CREATE INDEX CONCURRENTLY idx_tickets_active ON tickets (id) WHERE is_deleted = false;
