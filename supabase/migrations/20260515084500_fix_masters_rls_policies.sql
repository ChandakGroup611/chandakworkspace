-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Master Data RLS Policy Stabilization & Queue Access
-- Fixes: Restores CRUD operations for Departments, Designations, and Workflow States
-- ============================================================================

-- 1. Departments RLS Policies
-- Allow reading active departments
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'departments' AND policyname = 'policy_departments_select') THEN
        CREATE POLICY policy_departments_select ON departments FOR SELECT USING (NOT is_deleted);
    END IF;
END $$;

-- Allow full mutation for authenticated operators
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'departments' AND policyname = 'policy_departments_mutate') THEN
        CREATE POLICY policy_departments_mutate ON departments FOR ALL USING (true);
    END IF;
END $$;


-- 2. Designations RLS Policies
-- Allow reading active designations
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'designations' AND policyname = 'policy_designations_select') THEN
        CREATE POLICY policy_designations_select ON designations FOR SELECT USING (NOT is_deleted);
    END IF;
END $$;

-- Allow full mutation for authenticated operators
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'designations' AND policyname = 'policy_designations_mutate') THEN
        CREATE POLICY policy_designations_mutate ON designations FOR ALL USING (true);
    END IF;
END $$;


-- 3. Workflow States RLS Policies
-- Allow reading active workflow states
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflow_states' AND policyname = 'policy_workflow_states_select') THEN
        CREATE POLICY policy_workflow_states_select ON workflow_states FOR SELECT USING (NOT is_deleted);
    END IF;
END $$;

-- Allow full mutation for authenticated operators
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflow_states' AND policyname = 'policy_workflow_states_mutate') THEN
        CREATE POLICY policy_workflow_states_mutate ON workflow_states FOR ALL USING (true);
    END IF;
END $$;


-- 4. Notification Queue RLS Policies
-- Allow application to insert broadcast events
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_queue' AND policyname = 'policy_notification_queue_insert') THEN
        CREATE POLICY policy_notification_queue_insert ON notification_queue FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Allow reading notifications
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_queue' AND policyname = 'policy_notification_queue_select') THEN
        CREATE POLICY policy_notification_queue_select ON notification_queue FOR SELECT USING (true);
    END IF;
END $$;


-- 5. Final Audit: Ensure RLS is actually enabled on these tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
