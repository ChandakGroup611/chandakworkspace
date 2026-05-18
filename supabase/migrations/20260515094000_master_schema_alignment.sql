-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Master Schema Convergence & Lifecycle Alignment
-- Purpose: Adds missing columns required by the UI to ensure CRUD reliability
-- ============================================================================

-- 1. Align 'assets' table
ALTER TABLE assets ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Align 'ticket_categories' and 'ticket_subcategories'
ALTER TABLE ticket_categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE ticket_subcategories ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Align 'departments' and 'designations'
ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE designations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE designations ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE designations ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE designations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure triggers exist for modtime tracking
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_designations_modtime') THEN
        CREATE TRIGGER update_designations_modtime
            BEFORE UPDATE ON designations
            FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
END $$;

-- 4. Align 'master_priorities'
ALTER TABLE master_priorities ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE master_priorities ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE master_priorities ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE master_priorities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_priorities_modtime') THEN
        CREATE TRIGGER update_priorities_modtime
            BEFORE UPDATE ON master_priorities
            FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
END $$;

-- 5. Ensure all other masters have the description column to prevent UI failures
ALTER TABLE issue_types ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE issue_subtypes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE software_systems ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE software_modules ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE software_submodules ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE workflow_states ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE approval_types ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE task_types ADD COLUMN IF NOT EXISTS description TEXT;

-- NOTE: RLS Capability Policies are fully established in migration 20260515093500.
-- Running that migration first ensures all columns (including these new ones) are covered.
