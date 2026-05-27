-- ============================================================================
-- Production Performance Optimization: Missing Foreign Key Indexes
-- ============================================================================

-- 1. TICKETS
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets(priority_id) WHERE NOT is_deleted;



-- 3. TASKS (Enterprise Task Engine)
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON public.tasks(workspace_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_tasks_creator ON public.tasks(created_by) WHERE NOT is_deleted;

-- 4. REQUIREMENTS
CREATE INDEX IF NOT EXISTS idx_reqs_status ON public.requirements(status_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_reqs_creator ON public.requirements(creator_id) WHERE NOT is_deleted;

-- 5. RELATIONAL MAPPINGS
CREATE INDEX IF NOT EXISTS idx_task_watchers_user ON public.task_watchers(user_id) WHERE NOT is_deleted;

CREATE INDEX IF NOT EXISTS idx_req_watchers_user ON public.requirement_watchers(user_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_req_approvers_user ON public.requirement_approvals(approver_id);

-- 6. USER MASTER Hierarchy
CREATE INDEX IF NOT EXISTS idx_users_manager ON public.user_master(manager_id) WHERE NOT is_deleted;

-- 7. NOTIFICATION / EVENT QUEUES
CREATE INDEX IF NOT EXISTS idx_notif_queue_is_read ON public.notification_queue(is_read, recipient_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_is_sent ON public.email_queue(is_sent);
