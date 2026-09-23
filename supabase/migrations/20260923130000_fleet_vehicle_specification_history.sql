-- ==============================================================================
-- Migration: Fleet Vehicle Specification Modification History & Comprehensive Audit Ledger
-- Date: 2026-09-23
-- Module: VEHICLE_DESK (Fleet Management)
-- Description: Unbroken audit trail and revision history tracking all vehicle
--              specification updates, powertrain changes, RTO records & compliance adjustments.
-- ==============================================================================

-- 1. Create vehicle_specification_history table
CREATE TABLE IF NOT EXISTS public.vehicle_specification_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_name VARCHAR(255) DEFAULT 'Fleet Officer',
  changed_by_email VARCHAR(255),
  change_summary TEXT NOT NULL,
  old_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  new_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  changed_fields TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Indexes for instant lookup
CREATE INDEX IF NOT EXISTS idx_vehicle_spec_history_vehicle_id ON public.vehicle_specification_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_spec_history_created_at ON public.vehicle_specification_history(vehicle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_spec_history_changed_by ON public.vehicle_specification_history(changed_by);

-- 3. Row Level Security (RLS)
ALTER TABLE public.vehicle_specification_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view vehicle specification history" ON public.vehicle_specification_history;
DROP POLICY IF EXISTS "Allow fleet managers to manage vehicle specification history" ON public.vehicle_specification_history;

CREATE POLICY "Allow authenticated users to view vehicle specification history"
ON public.vehicle_specification_history
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow fleet managers to manage vehicle specification history"
ON public.vehicle_specification_history
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_specification_history TO authenticated;
