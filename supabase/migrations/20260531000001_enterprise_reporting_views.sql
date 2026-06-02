-- ============================================================================
-- Enterprise Authorization & Reporting Refactor
-- Phase 4: Reporting & Filtering Views
-- ============================================================================

-- Note: All views are created with security_invoker = true so they respect the underlying RLS policies of the tables.

-- 1. Assigned To Me
CREATE OR REPLACE VIEW public.vw_reports_assigned_to_me WITH (security_invoker=true) AS
SELECT t.* FROM public.tasks t
WHERE t.assigned_to = auth.uid();

-- 2. Created By Me
CREATE OR REPLACE VIEW public.vw_reports_created_by_me WITH (security_invoker=true) AS
SELECT t.* FROM public.tasks t
WHERE t.created_by = auth.uid();

-- 3. Workspace Wise Tasks
CREATE OR REPLACE VIEW public.vw_reports_workspace_wise WITH (security_invoker=true) AS
SELECT w.workspace_name, t.* 
FROM public.tasks t
JOIN public.workspaces w ON t.workspace_id = w.id;

-- 4. Sub Workspace Wise Tasks
CREATE OR REPLACE VIEW public.vw_reports_sub_workspace_wise WITH (security_invoker=true) AS
SELECT sw.name AS sub_workspace_name, t.* 
FROM public.tasks t
JOIN public.sub_workspaces sw ON t.sub_workspace_id = sw.id;

-- 5. Task Owner Wise Report
CREATE OR REPLACE VIEW public.vw_reports_task_owner_wise WITH (security_invoker=true) AS
SELECT u.full_name AS owner_name, t.* 
FROM public.tasks t
JOIN public.user_master u ON t.assigned_to = u.id;

-- 6. Sub Task Owner Wise Report
CREATE OR REPLACE VIEW public.vw_reports_sub_task_owner_wise WITH (security_invoker=true) AS
SELECT u.full_name AS owner_name, st.* 
FROM public.sub_tasks st
JOIN public.user_master u ON st.assigned_to = u.id;

-- 7. Open Tasks
CREATE OR REPLACE VIEW public.vw_reports_open_tasks WITH (security_invoker=true) AS
SELECT t.* FROM public.tasks t
JOIN public.status_master sm ON t.status_id = sm.id
WHERE sm.status_code = 'ST_OPEN' OR sm.status_name ILIKE '%Open%';

-- 8. In Progress Tasks
CREATE OR REPLACE VIEW public.vw_reports_in_progress_tasks WITH (security_invoker=true) AS
SELECT t.* FROM public.tasks t
JOIN public.status_master sm ON t.status_id = sm.id
WHERE sm.status_code = 'ST_IN_PROGRESS' OR sm.status_name ILIKE '%In Progress%';

-- 9. Completed Tasks
CREATE OR REPLACE VIEW public.vw_reports_completed_tasks WITH (security_invoker=true) AS
SELECT t.* FROM public.tasks t
JOIN public.status_master sm ON t.status_id = sm.id
WHERE sm.is_closed = true;

-- 10. Overdue Tasks
CREATE OR REPLACE VIEW public.vw_reports_overdue_tasks WITH (security_invoker=true) AS
SELECT t.* FROM public.tasks t
JOIN public.status_master sm ON t.status_id = sm.id
WHERE sm.is_closed = false AND t.end_date < CURRENT_DATE;

-- 11. SLA Breached Tasks (Assuming end_date is the SLA target for now, or due_date if it exists)
-- Using end_date as proxy for due_date
CREATE OR REPLACE VIEW public.vw_reports_sla_breached WITH (security_invoker=true) AS
SELECT t.* FROM public.tasks t
JOIN public.status_master sm ON t.status_id = sm.id
WHERE sm.is_closed = false AND t.end_date < CURRENT_DATE;

-- 12. Due Today
CREATE OR REPLACE VIEW public.vw_reports_due_today WITH (security_invoker=true) AS
SELECT t.* FROM public.tasks t
WHERE t.end_date = CURRENT_DATE OR t.start_date = CURRENT_DATE;

-- 13. Due This Week
CREATE OR REPLACE VIEW public.vw_reports_due_this_week WITH (security_invoker=true) AS
SELECT t.* FROM public.tasks t
WHERE date_trunc('week', t.end_date) = date_trunc('week', CURRENT_DATE);

-- 14. Due This Month
CREATE OR REPLACE VIEW public.vw_reports_due_this_month WITH (security_invoker=true) AS
SELECT t.* FROM public.tasks t
WHERE date_trunc('month', t.end_date) = date_trunc('month', CURRENT_DATE);

-- 15. Activity Summary (from task_activity_logs)
CREATE OR REPLACE VIEW public.vw_reports_activity_summary WITH (security_invoker=true) AS
SELECT a.* 
FROM public.task_activity_logs a
JOIN public.tasks t ON a.task_id = t.id;

-- 16. User Productivity Report
CREATE OR REPLACE VIEW public.vw_reports_user_productivity WITH (security_invoker=true) AS
SELECT 
    u.id AS user_id,
    u.full_name,
    COUNT(t.id) FILTER (WHERE sm.is_closed = true) AS completed_tasks,
    COUNT(t.id) FILTER (WHERE sm.is_closed = false AND t.end_date < CURRENT_DATE) AS overdue_tasks,
    COUNT(t.id) AS total_assigned_tasks
FROM public.user_master u
LEFT JOIN public.tasks t ON t.assigned_to = u.id
LEFT JOIN public.status_master sm ON t.status_id = sm.id
GROUP BY u.id, u.full_name;

-- 17. Workspace Productivity Report
CREATE OR REPLACE VIEW public.vw_reports_workspace_productivity WITH (security_invoker=true) AS
SELECT 
    w.id AS workspace_id,
    w.workspace_name,
    COUNT(t.id) FILTER (WHERE sm.is_closed = true) AS completed_tasks,
    COUNT(t.id) FILTER (WHERE sm.is_closed = false AND t.end_date < CURRENT_DATE) AS overdue_tasks,
    COUNT(t.id) AS total_tasks
FROM public.workspaces w
LEFT JOIN public.tasks t ON t.workspace_id = w.id
LEFT JOIN public.status_master sm ON t.status_id = sm.id
GROUP BY w.id, w.workspace_name;

-- 18. Sub Workspace Productivity Report
CREATE OR REPLACE VIEW public.vw_reports_sub_workspace_productivity WITH (security_invoker=true) AS
SELECT 
    sw.id AS sub_workspace_id,
    sw.name AS sub_workspace_name,
    COUNT(t.id) FILTER (WHERE sm.is_closed = true) AS completed_tasks,
    COUNT(t.id) FILTER (WHERE sm.is_closed = false AND t.end_date < CURRENT_DATE) AS overdue_tasks,
    COUNT(t.id) AS total_tasks
FROM public.sub_workspaces sw
LEFT JOIN public.tasks t ON t.sub_workspace_id = sw.id
LEFT JOIN public.status_master sm ON t.status_id = sm.id
GROUP BY sw.id, sw.name;

-- Grant permissions explicitly
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
