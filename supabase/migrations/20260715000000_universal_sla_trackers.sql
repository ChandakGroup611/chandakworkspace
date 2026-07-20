-- ============================================================================
-- Phase 4 Migration: Universal SLA Trackers Expansion
-- Expand ticket_sla_trackers to also support tasks and requirements
-- ============================================================================

-- 1. Modify ticket_sla_trackers schema
ALTER TABLE public.ticket_sla_trackers ALTER COLUMN ticket_id DROP NOT NULL;
ALTER TABLE public.ticket_sla_trackers ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;
ALTER TABLE public.ticket_sla_trackers ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES public.requirements(id) ON DELETE CASCADE;

-- Ensure only one entity type is tracked per row
ALTER TABLE public.ticket_sla_trackers 
ADD CONSTRAINT check_single_entity_sla 
CHECK (
  (CASE WHEN ticket_id IS NOT NULL THEN 1 ELSE 0 END) +
  (CASE WHEN task_id IS NOT NULL THEN 1 ELSE 0 END) +
  (CASE WHEN requirement_id IS NOT NULL THEN 1 ELSE 0 END) = 1
);

-- Remove old constraint
ALTER TABLE public.ticket_sla_trackers DROP CONSTRAINT IF EXISTS uq_ticket_sla;

-- Add new constraints for unique entity SLAs
CREATE UNIQUE INDEX IF NOT EXISTS uq_ticket_sla_idx ON public.ticket_sla_trackers (ticket_id) WHERE ticket_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_task_sla_idx ON public.ticket_sla_trackers (task_id) WHERE task_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_requirement_sla_idx ON public.ticket_sla_trackers (requirement_id) WHERE requirement_id IS NOT NULL;


-- 2. Trigger Function: Auto-Generate SLA Trackers
CREATE OR REPLACE FUNCTION public.fn_auto_create_sla_tracker()
RETURNS TRIGGER AS $$
DECLARE
    v_policy_id UUID;
BEGIN
    -- Fallback SLA Policy logic (assuming 'SLA_STANDARD' exists, or take the first one)
    SELECT id INTO v_policy_id FROM public.ticket_sla_policies WHERE code = 'SLA_STANDARD' LIMIT 1;
    IF v_policy_id IS NULL THEN
        SELECT id INTO v_policy_id FROM public.ticket_sla_policies LIMIT 1;
    END IF;

    -- If no policy exists globally, exit without tracking
    IF v_policy_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Insert appropriate tracker based on TG_TABLE_NAME
    IF TG_TABLE_NAME = 'tickets' THEN
        INSERT INTO public.ticket_sla_trackers (ticket_id, sla_policy_id) VALUES (NEW.id, v_policy_id);
    ELSIF TG_TABLE_NAME = 'tasks' THEN
        INSERT INTO public.ticket_sla_trackers (task_id, sla_policy_id) VALUES (NEW.id, v_policy_id);
    ELSIF TG_TABLE_NAME = 'requirements' THEN
        INSERT INTO public.ticket_sla_trackers (requirement_id, sla_policy_id) VALUES (NEW.id, v_policy_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Bind Triggers to Entity Tables
DROP TRIGGER IF EXISTS trg_tickets_sla_auto_create ON public.tickets;
CREATE TRIGGER trg_tickets_sla_auto_create
AFTER INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.fn_auto_create_sla_tracker();

DROP TRIGGER IF EXISTS trg_tasks_sla_auto_create ON public.tasks;
CREATE TRIGGER trg_tasks_sla_auto_create
AFTER INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.fn_auto_create_sla_tracker();

DROP TRIGGER IF EXISTS trg_requirements_sla_auto_create ON public.requirements;
CREATE TRIGGER trg_requirements_sla_auto_create
AFTER INSERT ON public.requirements
FOR EACH ROW EXECUTE FUNCTION public.fn_auto_create_sla_tracker();
