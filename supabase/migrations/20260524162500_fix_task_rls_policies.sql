-- ============================================================================
-- ADIOS PLATFORM MIGRATION - Fix RLS Policies for Task Sub-Entities
-- ============================================================================

-- This migration updates the Row Level Security policies for task_activity_logs,
-- task_audit_logs, task_chat_messages, and task_attachments so that they check
-- the unified `public.tasks` table instead of the deprecated `public.workspace_tasks`.

-- ==========================================
-- 1. task_activity_logs
-- ==========================================
DROP POLICY IF EXISTS policy_task_activity_logs_select ON public.task_activity_logs;
CREATE POLICY policy_task_activity_logs_select ON public.task_activity_logs 
    FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id));

DROP POLICY IF EXISTS policy_task_activity_logs_insert ON public.task_activity_logs;
CREATE POLICY policy_task_activity_logs_insert ON public.task_activity_logs 
    FOR INSERT TO authenticated 
    WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id));

-- ==========================================
-- 2. task_audit_logs
-- ==========================================
DROP POLICY IF EXISTS policy_task_audit_logs_select ON public.task_audit_logs;
CREATE POLICY policy_task_audit_logs_select ON public.task_audit_logs 
    FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id));

DROP POLICY IF EXISTS policy_task_audit_logs_insert ON public.task_audit_logs;
CREATE POLICY policy_task_audit_logs_insert ON public.task_audit_logs 
    FOR INSERT TO authenticated 
    WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id));

-- ==========================================
-- 3. task_chat_messages
-- ==========================================
DROP POLICY IF EXISTS policy_task_chat_select ON public.task_chat_messages;
CREATE POLICY policy_task_chat_select ON public.task_chat_messages 
    FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id));

DROP POLICY IF EXISTS policy_task_chat_insert ON public.task_chat_messages;
CREATE POLICY policy_task_chat_insert ON public.task_chat_messages 
    FOR INSERT TO authenticated 
    WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id));

-- ==========================================
-- 4. task_attachments
-- ==========================================
DROP POLICY IF EXISTS policy_task_attachments_select ON public.task_attachments;
CREATE POLICY policy_task_attachments_select ON public.task_attachments 
    FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id));

DROP POLICY IF EXISTS policy_task_attachments_insert ON public.task_attachments;
CREATE POLICY policy_task_attachments_insert ON public.task_attachments 
    FOR INSERT TO authenticated 
    WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id));

-- Note: Ensure RLS is actually enabled on these tables just in case it wasn't
ALTER TABLE public.task_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
