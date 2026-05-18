-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Numeric Scope Governance (1 = INFRA, 2 = ERP)
-- Purpose: Introduces scope_id to differentiate shared master records
-- ============================================================================

-- 1. Add scope_id column to all relevant master tables
DO $$ 
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'ticket_categories', 'ticket_subcategories', 
        'issue_types', 'issue_subtypes', 
        'master_priorities', 'workflow_states',
        'software_systems', 'departments'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS scope_id INTEGER DEFAULT 1', t);
        -- Defaulting to 1 (INFRA) to preserve existing data, 
        -- but we will update them below.
    END LOOP;
END $$;

-- 2. Seed/Update records with correct scope_id
-- Flag 1 = IT INFRA
-- Flag 2 = ERP/SOFTWARE

UPDATE ticket_categories SET scope_id = 1 WHERE code LIKE 'CAT_HW%' OR code = 'CAT_HARDWARE';
UPDATE ticket_categories SET scope_id = 2 WHERE code LIKE 'CAT_SW%' OR code = 'CAT_SOFTWARE' OR code LIKE 'CAT_ERP%';

UPDATE ticket_subcategories SET scope_id = 1 WHERE category_id IN (SELECT id FROM ticket_categories WHERE scope_id = 1);
UPDATE ticket_subcategories SET scope_id = 2 WHERE category_id IN (SELECT id FROM ticket_categories WHERE scope_id = 2);

-- Assign software systems to ERP (2)
UPDATE software_systems SET scope_id = 2;

-- Workflow states and Priorities are usually shared, but we can default them to 1
-- Unless we want specialized ones. 
-- For now, let's keep them accessible to both if needed, or default to 1.
-- Actually, the user says "all masters will be same ... differentiate with flag".

-- 3. Update RLS policies to be scope-aware (Optional, but good for future)
-- For now, we will handle the filtering in the UI.
