-- ============================================================================
-- Global Master Data Scope Alignment
-- Feature: Universal 'scope_id' (Flag) Governance across all Master Relations
-- ============================================================================

DO $$
DECLARE
    t text;
    tables_to_patch text[] := ARRAY[
        'issue_types', 
        'issue_subtypes', 
        'ticket_categories', 
        'ticket_subcategories', 
        'workflow_states', 
        'master_priorities', 
        'assets', 
        'software_systems', 
        'software_modules', 
        'software_submodules', 
        'departments', 
        'designations',
        'task_types',
        'approval_types'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_patch LOOP
        -- 1. Add scope_id column if missing
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS scope_id INTEGER', t);
        
        -- 2. Add is_deleted column if missing (for soft delete)
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false', t);
        
        -- 3. Add is_active column if missing
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true', t);

        -- 4. Add updated_at column if missing
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()', t);
    END LOOP;
END $$;

-- 5. Set default scopes for existing data to prevent 'vanishing'
UPDATE issue_types SET scope_id = 1 WHERE scope_id IS NULL;
UPDATE ticket_categories SET scope_id = 1 WHERE scope_id IS NULL;
UPDATE master_priorities SET scope_id = 1 WHERE scope_id IS NULL;
UPDATE workflow_states SET scope_id = 1 WHERE scope_id IS NULL;
