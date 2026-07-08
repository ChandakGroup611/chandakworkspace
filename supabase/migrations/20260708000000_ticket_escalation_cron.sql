-- Auto-Escalate Tickets Near SLA Breach
-- This script relies on pg_cron being enabled in the Supabase instance.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to escalate tickets
CREATE OR REPLACE FUNCTION auto_escalate_tickets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  critical_prio_id uuid;
  esc_status_id uuid;
BEGIN
  -- Find the CRITICAL priority ID
  SELECT id INTO critical_prio_id 
  FROM priority_master 
  WHERE priority_code = 'PR_CRITICAL' OR priority_name ILIKE '%Critical%' 
  LIMIT 1;

  -- Find the ESCALATED status ID
  SELECT id INTO esc_status_id 
  FROM status_master 
  WHERE status_code = 'ESCALATED' OR status_name ILIKE '%Escalat%' 
  LIMIT 1;

  IF critical_prio_id IS NOT NULL AND esc_status_id IS NOT NULL THEN
    -- Update tickets that are open, have a due date in the past, and are not already escalated
    UPDATE tickets
    SET 
      priority_id = critical_prio_id,
      status_id = esc_status_id,
      updated_at = NOW()
    WHERE 
      is_deleted = false 
      AND due_date IS NOT NULL 
      AND due_date < NOW()
      AND status_id != esc_status_id
      AND status_id NOT IN (
        SELECT id FROM status_master WHERE status_name ILIKE '%Resolv%' OR status_name ILIKE '%Clos%'
      );
  END IF;
END;
$$;

-- Unschedule if it exists to avoid errors on re-run
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ticket_sla_escalation') THEN
    PERFORM cron.unschedule('ticket_sla_escalation');
  END IF;
END
$$;

-- Schedule the job to run every hour
SELECT cron.schedule('ticket_sla_escalation', '0 * * * *', 'SELECT auto_escalate_tickets();');
