-- ============================================================================
-- Add Due Dates to Tickets and Requirements
-- ============================================================================

-- Add due_date column to tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- Add due_date column to requirements
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- Update tickets due_date based on priority_master SLA target
UPDATE tickets t
SET due_date = t.created_at + (p.max_sla_hours || ' hours')::interval
FROM priority_master p
WHERE t.priority_id = p.id AND t.due_date IS NULL;

-- If priority is null on tickets, default to 7 days
UPDATE tickets
SET due_date = created_at + interval '7 days'
WHERE due_date IS NULL;

-- Update requirements due_date based on priority if it exists, otherwise default to 14 days
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requirements' AND column_name = 'priority_id') THEN
        EXECUTE 'UPDATE requirements r SET due_date = r.created_at + (p.max_sla_hours || '' hours'')::interval FROM priority_master p WHERE r.priority_id = p.id AND r.due_date IS NULL;';
    END IF;
END $$;

UPDATE requirements
SET due_date = created_at + interval '14 days'
WHERE due_date IS NULL;
