-- ============================================================================
-- Migration: 20261024000000_copilot_engine_core.sql
-- Description: Core Schema & Hardened RLS for Chandak AI Copilot
-- Tables Created:
--   1. copilot_conversations (Conversations & context metadata)
--   2. copilot_messages (Append-only messages with anti-forgery RLS)
--   3. copilot_action_proposals (Canonical proposal storage with CAS state machine)
--   4. copilot_action_logs (Compliance & non-repudiation audit trail)
-- Security:
--   - Explicit RLS enabled across all four tables.
--   - Direct client INSERT/UPDATE/DELETE denied on proposals and audit logs.
--   - Role forgery and tool call spoofing blocked by RLS on messages.
--   - Server-controlled metadata protected by BEFORE UPDATE trigger on conversations.
-- ============================================================================

-- ============================================================================
-- 1. CONVERSATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.copilot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_code TEXT NOT NULL DEFAULT 'TASK_WORKFLOW' 
        CHECK (module_code IN ('TASK_WORKFLOW', 'VEHICLE_DESK', 'DESIGN_TRACKING', 'GENERAL')),
    title TEXT NOT NULL DEFAULT 'New Conversation',
    context_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_copilot_conversations_user_updated 
ON public.copilot_conversations (user_id, updated_at DESC);

-- Trigger function to enforce immutability on server-controlled conversation fields
CREATE OR REPLACE FUNCTION public.check_copilot_conversation_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.user_id <> OLD.user_id OR NEW.created_at <> OLD.created_at OR NEW.module_code <> OLD.module_code THEN
        RAISE EXCEPTION 'Cannot modify server-controlled conversation fields (user_id, created_at, module_code).';
    END IF;
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_copilot_conversation_update ON public.copilot_conversations;
CREATE TRIGGER tr_copilot_conversation_update
BEFORE UPDATE ON public.copilot_conversations
FOR EACH ROW EXECUTE FUNCTION public.check_copilot_conversation_update();


-- ============================================================================
-- 2. MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.copilot_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.copilot_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL DEFAULT '',
    tool_calls JSONB,
    action_preview JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_copilot_messages_convo_created 
ON public.copilot_messages (conversation_id, created_at ASC);


-- ============================================================================
-- 3. ACTION PROPOSALS TABLE (Canonical Server-Controlled Storage)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.copilot_action_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.copilot_conversations(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    target_entity_type TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    sanitized_payload JSONB NOT NULL,
    current_state_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    idempotency_key UUID NOT NULL UNIQUE,
    signature TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_CONFIRMATION' 
        CHECK (status IN (
            'PENDING_CONFIRMATION', 
            'EXECUTING', 
            'EXECUTED', 
            'EXPIRED', 
            'CANCELLED', 
            'REJECTED_UNAUTHORIZED', 
            'REJECTED_CONFLICT', 
            'FAILED',
            'FAILED_CRASH'
        )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    executed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_copilot_proposals_expiry 
ON public.copilot_action_proposals (expires_at) WHERE status = 'PENDING_CONFIRMATION';

CREATE INDEX IF NOT EXISTS idx_copilot_proposals_idempotency 
ON public.copilot_action_proposals (idempotency_key);


-- ============================================================================
-- 4. ACTION LOGS (Compliance & Legal Non-Repudiation Audit)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.copilot_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID REFERENCES public.copilot_action_proposals(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES public.copilot_conversations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email_snapshot TEXT NOT NULL,
    action_type TEXT NOT NULL,
    target_entity_type TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    execution_status TEXT NOT NULL CHECK (execution_status IN ('SUCCESS', 'FAILED', 'REJECTED')),
    result_summary JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_copilot_action_logs_user 
ON public.copilot_action_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_copilot_action_logs_entity 
ON public.copilot_action_logs (target_entity_type, target_entity_id);


-- ============================================================================
-- 5. EXPLICIT ROW LEVEL SECURITY (RLS) ON ALL 4 TABLES
-- ============================================================================

ALTER TABLE public.copilot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_action_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_action_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- copilot_conversations Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_conversations_select ON public.copilot_conversations;
CREATE POLICY policy_conversations_select ON public.copilot_conversations
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS policy_conversations_insert ON public.copilot_conversations;
CREATE POLICY policy_conversations_insert ON public.copilot_conversations
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS policy_conversations_update ON public.copilot_conversations;
CREATE POLICY policy_conversations_update ON public.copilot_conversations
    FOR UPDATE TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS policy_conversations_delete ON public.copilot_conversations;
CREATE POLICY policy_conversations_delete ON public.copilot_conversations
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- copilot_messages Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_messages_select ON public.copilot_messages;
CREATE POLICY policy_messages_select ON public.copilot_messages
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.copilot_conversations c 
        WHERE c.id = copilot_messages.conversation_id AND c.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS policy_messages_client_insert ON public.copilot_messages;
CREATE POLICY policy_messages_client_insert ON public.copilot_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND role = 'user'
        AND tool_calls IS NULL
        AND action_preview IS NULL
        AND EXISTS (
            SELECT 1 FROM public.copilot_conversations c 
            WHERE c.id = copilot_messages.conversation_id AND c.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS policy_messages_deny_update ON public.copilot_messages;
CREATE POLICY policy_messages_deny_update ON public.copilot_messages
    FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS policy_messages_delete ON public.copilot_messages;
CREATE POLICY policy_messages_delete ON public.copilot_messages
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.copilot_conversations c 
        WHERE c.id = copilot_messages.conversation_id AND c.user_id = auth.uid()
    ));

-- ----------------------------------------------------------------------------
-- copilot_action_proposals Policies
-- Clients can only read their own proposals.
-- Client INSERT, UPDATE, DELETE are strictly DENIED.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_proposals_select ON public.copilot_action_proposals;
CREATE POLICY policy_proposals_select ON public.copilot_action_proposals
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS policy_proposals_deny_insert ON public.copilot_action_proposals;
CREATE POLICY policy_proposals_deny_insert ON public.copilot_action_proposals
    FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS policy_proposals_deny_update ON public.copilot_action_proposals;
CREATE POLICY policy_proposals_deny_update ON public.copilot_action_proposals
    FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS policy_proposals_deny_delete ON public.copilot_action_proposals;
CREATE POLICY policy_proposals_deny_delete ON public.copilot_action_proposals
    FOR DELETE TO authenticated USING (false);

-- ----------------------------------------------------------------------------
-- copilot_action_logs Policies
-- Clients can only inspect their own audit logs.
-- Client INSERT, UPDATE, DELETE are strictly DENIED.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_action_logs_select ON public.copilot_action_logs;
CREATE POLICY policy_action_logs_select ON public.copilot_action_logs
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS policy_action_logs_deny_insert ON public.copilot_action_logs;
CREATE POLICY policy_action_logs_deny_insert ON public.copilot_action_logs
    FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS policy_action_logs_deny_update ON public.copilot_action_logs;
CREATE POLICY policy_action_logs_deny_update ON public.copilot_action_logs
    FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS policy_action_logs_deny_delete ON public.copilot_action_logs;
CREATE POLICY policy_action_logs_deny_delete ON public.copilot_action_logs
    FOR DELETE TO authenticated USING (false);
