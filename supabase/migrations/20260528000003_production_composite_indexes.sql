-- ============================================================================
-- PRODUCTION PERFORMANCE: CRITICAL COMPOSITE INDEXES
-- All table names and column names verified against actual migrations.
-- Safe to re-run — IF NOT EXISTS guards on every statement.
-- ============================================================================

-- ============================
-- WORKSPACES
-- Columns: workspace_owner_id, created_by, company_id
-- ============================
CREATE INDEX IF NOT EXISTS idx_workspaces_deleted_created
  ON public.workspaces (is_deleted, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_deleted
  ON public.workspaces (workspace_owner_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_workspaces_company_deleted
  ON public.workspaces (company_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_workspaces_created_by
  ON public.workspaces (created_by, is_deleted);

-- ============================
-- TASKS
-- Columns: workspace_id, status_id, priority_id, created_by
-- NOTE: No assignee_id on tasks table (assignments removed in workspace refactor)
-- ============================
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_deleted
  ON public.tasks (workspace_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_created
  ON public.tasks (workspace_id, created_at DESC) WHERE NOT is_deleted;

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status
  ON public.tasks (workspace_id, status_id) WHERE NOT is_deleted;

CREATE INDEX IF NOT EXISTS idx_tasks_created_by_deleted
  ON public.tasks (created_by, is_deleted);

-- ============================
-- TICKETS
-- Columns: assignee_id, creator_id, department_id, status_id
-- ============================
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_deleted
  ON public.tickets (assignee_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_tickets_creator_deleted
  ON public.tickets (creator_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_tickets_dept_status
  ON public.tickets (department_id, status_id) WHERE NOT is_deleted;

CREATE INDEX IF NOT EXISTS idx_tickets_created_id_desc
  ON public.tickets (created_at DESC, id DESC) WHERE NOT is_deleted;

-- ============================
-- REQUIREMENTS
-- ============================
CREATE INDEX IF NOT EXISTS idx_reqs_dept_status
  ON public.requirements (department_id, status_id) WHERE NOT is_deleted;

CREATE INDEX IF NOT EXISTS idx_reqs_created_desc
  ON public.requirements (created_at DESC, id DESC) WHERE NOT is_deleted;

-- ============================
-- USER MASTER
-- ============================
CREATE INDEX IF NOT EXISTS idx_users_active_deleted
  ON public.user_master (is_active, is_deleted);

CREATE INDEX IF NOT EXISTS idx_users_dept_deleted
  ON public.user_master (department_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_users_role_deleted
  ON public.user_master (role_id, is_deleted);

-- ============================
-- WORKSPACE MEMBERS
-- Critical: used in is_workspace_member() which runs on every RLS row check
-- ============================
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_workspace
  ON public.workspace_members (user_id, workspace_id);

-- ============================
-- TASK ACTIVITY + AUDIT LOGS
-- ============================
CREATE INDEX IF NOT EXISTS idx_task_activity_task_created
  ON public.task_activity_logs (task_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_audit_task_created
  ON public.task_audit_logs (task_id, created_at DESC);

-- ============================
-- TICKET AUDIT LOGS
-- ============================
CREATE INDEX IF NOT EXISTS idx_ticket_audit_ticket_created
  ON public.ticket_audit_logs (ticket_id, created_at DESC);

-- ============================
-- NOTIFICATION QUEUE
-- ============================
CREATE INDEX IF NOT EXISTS idx_notif_recipient_read_created
  ON public.notification_queue (recipient_id, is_read, created_at DESC)
  WHERE recipient_id IS NOT NULL;

-- ============================
-- SYSTEM DOMAIN EVENTS
-- ============================
CREATE INDEX IF NOT EXISTS idx_domain_events_entity_created
  ON public.system_domain_events (entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_domain_events_type_created
  ON public.system_domain_events (event_type, created_at DESC);

-- ============================
-- USER PERMISSIONS SNAPSHOT
-- Most critical: called per-row on EVERY RLS policy evaluation
-- ============================
CREATE INDEX IF NOT EXISTS idx_ups_user_perm
  ON public.user_permissions_snapshot (user_id, permission_code);
