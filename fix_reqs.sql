-- Rename columns to match API if they exist
DO $$ BEGIN
  ALTER TABLE requirements RENAME COLUMN code TO requirement_code;
EXCEPTION WHEN undefined_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE requirements RENAME COLUMN creator_id TO created_by;
EXCEPTION WHEN undefined_column THEN END $$;

-- Add missing columns
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS sub_workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS business_value TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS risk_assessment TEXT;

ALTER TABLE requirements ADD COLUMN IF NOT EXISTS budget_impact NUMERIC;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS estimated_effort TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS dependency_notes TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS scope TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS source_ticket_id UUID;

-- Drop NOT NULL constraints that break inserts
ALTER TABLE requirements ALTER COLUMN department_id DROP NOT NULL;
ALTER TABLE requirements ALTER COLUMN status_id DROP NOT NULL;
