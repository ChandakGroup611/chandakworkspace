-- ==============================================================================
-- CHANDAK WORKSPACE - ENTERPRISE PERFORMANCE TUNING
-- Target: Optimizing heavy dashboard queries with partial composite indexes
-- Using CONCURRENTLY to prevent locking large tables during deployment
-- ==============================================================================

-- Disable transaction to allow CONCURRENTLY
COMMIT;

-- 1. Tasks Module
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_perf_is_deleted_created_at ON public.tasks (is_deleted, created_at DESC) WHERE is_deleted = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_perf_workspace_deleted ON public.tasks (workspace_id) WHERE is_deleted = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_perf_parent_deleted ON public.tasks (parent_task_id) WHERE is_deleted = false AND parent_task_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_perf_assignee_deleted ON public.tasks (assigned_to) WHERE is_deleted = false AND assigned_to IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_participants_perf_user ON public.task_participants (user_id) WHERE is_deleted = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_participants_perf_task ON public.task_participants (task_id) WHERE is_deleted = false;

-- 2. Workspaces Module
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_perf_is_deleted ON public.workspaces (is_deleted, created_at DESC) WHERE is_deleted = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_perf_parent_null ON public.workspaces (is_deleted) WHERE parent_workspace_id IS NULL AND is_deleted = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_perf_owner ON public.workspaces (workspace_owner_id) WHERE is_deleted = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_members_perf_user ON public.workspace_members (user_id) WHERE is_deleted = false;

-- 3. Tickets & Requirements Module
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_perf_manager ON public.tickets (manager_id) WHERE is_deleted = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_perf_is_deleted ON public.tickets (is_deleted, created_at DESC) WHERE is_deleted = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requirements_perf_task ON public.requirements (task_id) WHERE is_deleted = false AND task_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requirements_perf_is_deleted ON public.requirements (is_deleted, created_at DESC) WHERE is_deleted = false;

-- 4. IAM & Users Module
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_perf_user ON public.user_roles (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_perms_perf_user ON public.user_permissions_snapshot (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delete_batches_perf_id ON public.delete_batches (id);

-- Re-enable transaction block (for migration engine compatibility)
BEGIN;
