-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Workspace Containers & Enhanced Task Governance
-- Architecture: workspaces -> workspace_tasks (Hierarchical)
-- ============================================================================

-- 1. Create workspaces table (Project/Sprint containers)
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    status_id UUID REFERENCES workflow_states(id) ON DELETE RESTRICT,
    owner_id UUID REFERENCES user_master(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Link workspace_tasks to workspaces and user_master
ALTER TABLE workspace_tasks ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE workspace_tasks DROP CONSTRAINT IF EXISTS workspace_tasks_assignee_fkey;
ALTER TABLE workspace_tasks ADD CONSTRAINT workspace_tasks_assignee_fkey FOREIGN KEY (assignee_id) REFERENCES user_master(id) ON DELETE SET NULL;
ALTER TABLE workspace_tasks DROP CONSTRAINT IF EXISTS workspace_tasks_creator_fkey;
ALTER TABLE workspace_tasks ADD CONSTRAINT workspace_tasks_creator_fkey FOREIGN KEY (creator_id) REFERENCES user_master(id) ON DELETE SET NULL;

-- 2.1 Ensure tickets also have proper relationships to user_master
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_assignee_fkey;
ALTER TABLE tickets ADD CONSTRAINT tickets_assignee_fkey FOREIGN KEY (assignee_id) REFERENCES user_master(id) ON DELETE SET NULL;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_creator_fkey;
ALTER TABLE tickets ADD CONSTRAINT tickets_creator_fkey FOREIGN KEY (creator_id) REFERENCES user_master(id) ON DELETE SET NULL;

-- 3. Enhance RLS for Workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_workspaces_select ON workspaces;
CREATE POLICY policy_workspaces_select ON workspaces FOR SELECT USING (true);

DROP POLICY IF EXISTS policy_workspaces_insert ON workspaces;
CREATE POLICY policy_workspaces_insert ON workspaces FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS policy_workspaces_update ON workspaces;
CREATE POLICY policy_workspaces_update ON workspaces FOR UPDATE USING (
    owner_id = auth.uid() OR has_permission_snapshot('WORKSPACES_MANAGE')
);

DROP POLICY IF EXISTS policy_workspaces_delete ON workspaces;
CREATE POLICY policy_workspaces_delete ON workspaces FOR DELETE USING (
    owner_id = auth.uid() OR has_permission_snapshot('WORKSPACES_MANAGE')
);

-- 4. Enhance RLS for Workspace Tasks to be Workspace-Aware
ALTER TABLE workspace_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_tasks_workspace_select ON workspace_tasks;
CREATE POLICY policy_tasks_workspace_select ON workspace_tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS policy_tasks_workspace_all ON workspace_tasks;
CREATE POLICY policy_tasks_workspace_all ON workspace_tasks FOR ALL USING (
    creator_id = auth.uid() OR assignee_id = auth.uid() OR has_permission_snapshot('WORKSPACES_MANAGE')
);

-- 4.5 Ensure workflow states and permissions exist for seeding
INSERT INTO workflow_states (code, name, module) VALUES
    ('ST_OPEN', 'Open State', 'tickets'),
    ('ST_IN_PROGRESS', 'In Progress', 'tickets')
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions (code, name, module, action) VALUES
    ('WORKSPACES_MANAGE', 'Manage All Workspaces', 'workspaces', 'all')
ON CONFLICT (code) DO NOTHING;

-- 5. Seed Demonstration Workspaces
INSERT INTO workspaces (id, code, name, description, owner_id, status_id, department_id) VALUES
    ('a1f8e8e8-a1a1-4a1a-b1b1-a1a1a1a1a1a1', 'Q2-OPS-DEPLOY', 'Q2 Cloud Operations Deployment', 'Infrastructure overhaul and multi-AZ migration sprint.', (SELECT id FROM user_master WHERE user_code = 'USR-EXEC-001'), (SELECT id FROM workflow_states WHERE code = 'ST_OPEN' LIMIT 1), (SELECT id FROM departments WHERE code = 'DEPT_ITSM_CORE' LIMIT 1)),
    ('b2f8e8e8-b2b2-4b2b-c2c2-b2b2b2b2b2b2', 'ERP-UPGRADE-26', 'ERP S/4HANA Upgrade Phase 1', 'Financial module re-calibration and audit compliance.', (SELECT id FROM user_master WHERE user_code = 'USR-OPS-002'), (SELECT id FROM workflow_states WHERE code = 'ST_OPEN' LIMIT 1), (SELECT id FROM departments WHERE code = 'DEPT_ITSM_CORE' LIMIT 1))
ON CONFLICT (code) DO NOTHING;

-- 6. Seed Demonstration Tasks for Q2-OPS-DEPLOY
INSERT INTO workspace_tasks (code, title, description, workspace_id, status_id, department_id, creator_id, assignee_id, progress_percentage) VALUES
    ('TSK-8091', 'Core IAM Edge Routing Sync', 'Synchronize identity access management layers across edge routing clusters.', 'a1f8e8e8-a1a1-4a1a-b1b1-a1a1a1a1a1a1', (SELECT id FROM workflow_states WHERE code = 'ST_IN_PROGRESS' LIMIT 1), (SELECT id FROM departments WHERE code = 'DEPT_ITSM_CORE' LIMIT 1), (SELECT id FROM user_master WHERE user_code = 'USR-EXEC-001'), (SELECT id FROM user_master WHERE user_code = 'USR-SRE-003'), 75)
ON CONFLICT (code) DO NOTHING;

-- 7. Seed Checklists
INSERT INTO task_checklists (task_id, label, is_completed)
SELECT id, 'Verify secondary AWS read replica multi-AZ failover parameters', true FROM workspace_tasks WHERE code = 'TSK-8091'
UNION ALL
SELECT id, 'Flush IAM RBAC stale middleware validation caches via Edge Functions', true FROM workspace_tasks WHERE code = 'TSK-8091'
UNION ALL
SELECT id, 'Re-index Supabase database snapshot indices on high traffic tuples', false FROM workspace_tasks WHERE code = 'TSK-8091'
UNION ALL
SELECT id, 'Conduct staging regression suite tests on layout orchestration wrappers', false FROM workspace_tasks WHERE code = 'TSK-8091'
ON CONFLICT DO NOTHING;
