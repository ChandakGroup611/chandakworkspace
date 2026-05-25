-- ============================================================================
-- Phase 4 Migration: Centralized Masters Refactor & Simplification
-- ============================================================================

-- 1. Rename existing master tables to align with Enterprise Architecture
ALTER TABLE IF EXISTS public.workflow_states RENAME TO status_master;
ALTER TABLE IF EXISTS public.master_priorities RENAME TO priority_master;

-- 2. Update status_master with new fields
ALTER TABLE public.status_master 
  ADD COLUMN IF NOT EXISTS scope_type TEXT,
  ADD COLUMN IF NOT EXISTS status_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_reopen BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_terminal BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='status_master' AND column_name='name') THEN
    ALTER TABLE public.status_master RENAME COLUMN name TO status_name;
  END IF;
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='status_master' AND column_name='code') THEN
    ALTER TABLE public.status_master RENAME COLUMN code TO status_code;
  END IF;
END $$;
ALTER TABLE public.status_master ADD COLUMN IF NOT EXISTS status_color TEXT;

-- 3. Update priority_master with new fields
ALTER TABLE public.priority_master
  ADD COLUMN IF NOT EXISTS min_sla_hours INTEGER,
  ADD COLUMN IF NOT EXISTS max_sla_hours INTEGER,
  ADD COLUMN IF NOT EXISTS warning_sla_hours INTEGER,
  ADD COLUMN IF NOT EXISTS sla_start_from TEXT DEFAULT 'FROM_CREATION',
  ADD COLUMN IF NOT EXISTS scope_type TEXT,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='priority_master' AND column_name='name') THEN
    ALTER TABLE public.priority_master RENAME COLUMN name TO priority_name;
  END IF;
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='priority_master' AND column_name='code') THEN
    ALTER TABLE public.priority_master RENAME COLUMN code TO priority_code;
  END IF;
END $$;
ALTER TABLE public.priority_master ADD COLUMN IF NOT EXISTS priority_color TEXT;

-- Migrate SLA minutes to SLA hours for existing records if present
-- (Assuming old column was sla_target_minutes, if it existed from Phase 3)
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='priority_master' AND column_name='sla_target_minutes') THEN
    UPDATE public.priority_master SET max_sla_hours = CAST(sla_target_minutes / 60 AS INTEGER) WHERE sla_target_minutes IS NOT NULL;
    ALTER TABLE public.priority_master DROP COLUMN sla_target_minutes;
  END IF;
END $$;


-- 4. Create workflow_transition_master for dynamic transitions
CREATE TABLE IF NOT EXISTS public.workflow_transition_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_status_id UUID REFERENCES public.status_master(id),
    to_status_id UUID REFERENCES public.status_master(id) NOT NULL,
    scope_type TEXT NOT NULL,
    allowed_role_id UUID, -- References role master if needed
    requires_approval BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- 5. Create activity_events for centralized audit and timeline tracking
CREATE TABLE IF NOT EXISTS public.activity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_type TEXT NOT NULL, -- 'TICKET', 'TASK', 'WORKSPACE'
    record_id UUID NOT NULL,
    event_type TEXT NOT NULL, -- 'STATUS_CHANGE', 'COMMENT', 'ASSIGNMENT', 'CHECKLIST_UPDATE', 'UPLOAD'
    old_value JSONB,
    new_value JSONB,
    performed_by UUID NOT NULL REFERENCES auth.users(id),
    performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN DEFAULT false
);

-- 6. Simplify RLS visibility globally as per requirements
-- All tables from here on will only require basic auth validation, actual governance happens at the App/Repo layer.

-- Drop existing complex policies for tickets (created in earlier phases)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'tickets' AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.tickets', pol.policyname);
    END LOOP;
END $$;

-- Enable simple auth-based RLS on tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tickets Authenticated Access" ON public.tickets;
CREATE POLICY "Tickets Authenticated Access" ON public.tickets
    FOR ALL
    TO authenticated
    USING (auth.uid() IS NOT NULL);

-- Apply basic Auth RLS to Masters and Audits
ALTER TABLE public.status_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "status_master Access" ON public.status_master;
CREATE POLICY "status_master Access" ON public.status_master FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.priority_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "priority_master Access" ON public.priority_master;
CREATE POLICY "priority_master Access" ON public.priority_master FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.workflow_transition_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workflow_transition_master Access" ON public.workflow_transition_master;
CREATE POLICY "workflow_transition_master Access" ON public.workflow_transition_master FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_events Access" ON public.activity_events;
CREATE POLICY "activity_events Access" ON public.activity_events FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);
