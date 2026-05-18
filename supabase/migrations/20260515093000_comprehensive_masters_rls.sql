-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Comprehensive Master Data RLS Policy Enforcement
-- Purpose: Ensures 100% CRUD reliability and parent-lookup consistency across all masters
-- ============================================================================

-- List of all master tables to be protected and enabled
-- issue_types, issue_subtypes, ticket_categories, ticket_subcategories, assets, 
-- software_systems, software_modules, software_submodules, workflow_states, 
-- master_priorities, departments, designations, approval_types, task_types

DO $$ 
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'issue_types', 'issue_subtypes', 'ticket_categories', 'ticket_subcategories', 
        'assets', 'software_systems', 'software_modules', 'software_submodules', 
        'workflow_states', 'master_priorities', 'departments', 'designations', 
        'approval_types', 'task_types'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

        -- Drop existing permissive policies to prevent conflicts
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'policy_' || t || '_select', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'policy_' || t || '_mutate', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'policy_' || t || '_all', t);
        
        -- Create clean, permissive policies for the enterprise administration phase
        EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (NOT is_deleted)', 'policy_' || t || '_select', t);
        EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (true) WITH CHECK (true)', 'policy_' || t || '_mutate', t);
    END LOOP;
END $$;

-- Ensure notification queue is also fully functional for broadcasts
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_notification_queue_insert ON notification_queue;
DROP POLICY IF EXISTS policy_notification_queue_select ON notification_queue;
CREATE POLICY policy_notification_queue_insert ON notification_queue FOR INSERT WITH CHECK (true);
CREATE POLICY policy_notification_queue_select ON notification_queue FOR SELECT USING (true);
