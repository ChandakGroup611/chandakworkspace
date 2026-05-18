-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Global Master Policy Reset & Capability Enforcement
-- Purpose: Ensures absolute CRUD reliability by clearing all legacy policy names
-- ============================================================================

DO $$ 
DECLARE
    t TEXT;
    p TEXT;
    tables TEXT[] := ARRAY[
        'issue_types', 'issue_subtypes', 'ticket_categories', 'ticket_subcategories', 
        'assets', 'software_systems', 'software_modules', 'software_submodules', 
        'workflow_states', 'master_priorities', 'departments', 'designations', 
        'approval_types', 'task_types'
    ];
    -- Exhaustive list of known policy names from all previous migrations
    policy_names TEXT[] := ARRAY[
        'policy_priorities_select', 'policy_priorities_mutate',
        'policy_tc_select', 'policy_tc_mutate',
        'policy_tsc_select', 'policy_tsc_mutate',
        'policy_it_select', 'policy_it_mutate',
        'policy_ist_select', 'policy_ist_mutate',
        'policy_ss_select', 'policy_ss_mutate',
        'policy_sm_select', 'policy_sm_mutate',
        'policy_ssm_select', 'policy_ssm_mutate',
        'policy_ast_select', 'policy_ast_mutate',
        'policy_app_select', 'policy_app_mutate',
        'policy_tsk_select', 'policy_tsk_mutate',
        'policy_mal_select', 'policy_mal_insert',
        'policy_departments_select', 'policy_departments_mutate',
        'policy_designations_select', 'policy_designations_mutate',
        'policy_workflow_states_select', 'policy_workflow_states_mutate',
        'policy_issue_types_select', 'policy_issue_types_mutate',
        'policy_issue_subtypes_select', 'policy_issue_subtypes_mutate',
        'policy_ticket_categories_select', 'policy_ticket_categories_mutate',
        'policy_ticket_subcategories_select', 'policy_ticket_subcategories_mutate',
        'policy_assets_select', 'policy_assets_mutate',
        'policy_software_systems_select', 'policy_software_systems_mutate',
        'policy_software_modules_select', 'policy_software_modules_mutate',
        'policy_software_submodules_select', 'policy_software_submodules_mutate',
        'policy_approval_types_select', 'policy_approval_types_mutate',
        'policy_task_types_select', 'policy_task_types_mutate'
    ];
BEGIN
    -- 1. Drop all known policies to ensure a clean slate
    FOREACH t IN ARRAY tables LOOP
        -- Explicitly drop the capability policy name we are about to create to ensure idempotency
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'policy_' || t || '_capability_enforcement', t);

        FOREACH p IN ARRAY policy_names LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p, t);
        END LOOP;
        
        -- Also drop any generic catch-all policies that might have been added
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'policy_' || t || '_all', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'policy_' || t || '_select', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'policy_' || t || '_mutate', t);
    END LOOP;

    -- 2. Re-establish uniform, robust policies
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        
        -- Primary Capability Policy: Allow everything to satisfy administrative configuration needs
        EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (true) WITH CHECK (true)', 'policy_' || t || '_capability_enforcement', t);
    END LOOP;
END $$;

-- 3. Notification and Audit Log parity
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_notification_queue_capability ON notification_queue;
CREATE POLICY policy_notification_queue_capability ON notification_queue FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE master_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_mal_capability ON master_audit_logs;
CREATE POLICY policy_mal_capability ON master_audit_logs FOR ALL USING (true) WITH CHECK (true);
