-- ============================================================================
-- Migration: Add Missing Requirement Fields
-- Purpose: Introduce all remaining 22 enterprise requirement fields identified in gap analysis.
-- ============================================================================

BEGIN;

ALTER TABLE public.requirements
-- Relational / Master Data Identifiers
ADD COLUMN IF NOT EXISTS source_ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS requirement_type_id UUID, -- Generic UUID if requirement_types doesn't exist
ADD COLUMN IF NOT EXISTS business_criticality_id UUID,
ADD COLUMN IF NOT EXISTS business_value_id UUID,
ADD COLUMN IF NOT EXISTS project_id UUID,
ADD COLUMN IF NOT EXISTS sprint_id UUID,
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS coordinator_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,

-- Planning and Dates
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expected_completion_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_completion_date TIMESTAMPTZ,

-- Details and Assessments
ADD COLUMN IF NOT EXISTS requirement_reason TEXT,
ADD COLUMN IF NOT EXISTS budget_impact TEXT,
ADD COLUMN IF NOT EXISTS estimated_effort TEXT, -- Keeping as TEXT to allow "5 days", "10 pts", etc., or numeric. Usually TEXT if flexible.
ADD COLUMN IF NOT EXISTS dependency_notes TEXT,
ADD COLUMN IF NOT EXISTS release_version TEXT,
ADD COLUMN IF NOT EXISTS tat_status TEXT,
ADD COLUMN IF NOT EXISTS regulatory_mapping TEXT, -- Or JSONB, TEXT is safer for open mapping

-- Metrics (Calculated or hard-stored)
ADD COLUMN IF NOT EXISTS overdue_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_days INTEGER DEFAULT 0,

-- Deletion Tracking (Audit)
ADD COLUMN IF NOT EXISTS delete_reason TEXT,
ADD COLUMN IF NOT EXISTS delete_batch_id TEXT;

COMMIT;
