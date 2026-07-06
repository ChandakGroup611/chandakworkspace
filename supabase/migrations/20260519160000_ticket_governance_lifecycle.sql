-- ============================================================================
-- ADIOS PLATFORM MIGRATION - TICKET LIFECYCLE GOVERNANCE & AUDIT TRIGGER SYSTEM
-- ============================================================================

-- 0. CLEAN & INITIALIZE OPERATIONAL TABLES FOR AUDITING & NOTIFICATION QUEUES
-- ----------------------------------------------------------------------------
-- We drop any pre-existing old queue tables with outdated schemas to avoid column mismatch issues.

DROP TABLE IF EXISTS public.ticket_audit_logs CASCADE;
CREATE TABLE public.ticket_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    actor_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    operation TEXT NOT NULL,
    before_values JSONB,
    after_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TABLE IF EXISTS public.notification_queue CASCADE;
CREATE TABLE public.notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.user_master(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TABLE IF EXISTS public.email_queue CASCADE;
CREATE TABLE public.email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_template TEXT NOT NULL,
    is_sent BOOLEAN NOT NULL DEFAULT false,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 1. ADD EXPLICIT FOREIGN KEY RELATIONSHIPS FOR POSTGREST SCHEMAS
-- ----------------------------------------------------------------------------
-- Ensures PostgREST can resolve the creator/assignee joins dynamically.
-- We check and add them conditionally to prevent errors if they are already applied.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_creator'
    ) THEN
        ALTER TABLE public.tickets 
            ADD CONSTRAINT fk_tickets_creator 
            FOREIGN KEY (creator_id) 
            REFERENCES public.user_master(id) 
            ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_assignee'
    ) THEN
        ALTER TABLE public.tickets 
            ADD CONSTRAINT fk_tickets_assignee 
            FOREIGN KEY (assignee_id) 
            REFERENCES public.user_master(id) 
            ON DELETE SET NULL;
    END IF;
END $$;


-- 2. DEFINE SPECIFIC TICKET ACCESS GATING FUNCTION (NO CROSS-DEPARTMENT LEAKS)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_ticket(
    p_creator_id UUID, 
    p_assignee_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- RULE 1: SUPER_ADMIN sees everything (Fast JWT check)
    IF (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'SUPER_ADMIN'
    ) THEN RETURN TRUE; END IF;

    -- RULE 2: Ownership - Creator sees their own tickets
    IF auth.uid() = p_creator_id THEN RETURN TRUE; END IF;

    -- RULE 3: Assigned Work - Assignee sees tickets assigned to them to do work
    IF auth.uid() = p_assignee_id THEN RETURN TRUE; END IF;

    -- RULE 4: Reporting Line Manager check
    -- Allows creator's direct manager to view the ticket (Zero Cross-Listing allowed)
    IF EXISTS (
        SELECT 1 FROM public.user_master
        WHERE id = p_creator_id AND manager_id = auth.uid()
    ) THEN RETURN TRUE; END IF;

    RETURN FALSE;
END;
$$;


-- 3. APPLY ZERO-TRUST TICKET RLS POLICY
-- ----------------------------------------------------------------------------
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "policy_unified_tickets" ON public.tickets;
DROP POLICY IF EXISTS "policy_unified_tickets" ON public.tickets;
DROP POLICY IF EXISTS "policy_unified_tickets" ON public.tickets;
CREATE POLICY "policy_unified_tickets" ON public.tickets 
    FOR ALL TO authenticated 
    USING (public.can_access_ticket(creator_id, assignee_id));


-- 4. DEFINE HIGHLY ADAPTIVE AUTOMATED LIFECYCLE TRIGGER FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_ticket_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
    v_creator_email TEXT;
    v_creator_name TEXT;
    v_assignee_email TEXT;
    v_assignee_name TEXT;
    v_actor_id UUID;
    v_actor_name TEXT;
    v_old_status_name TEXT;
    v_new_status_name TEXT;
    v_operation TEXT;
    v_subject TEXT;
    v_body TEXT;
    v_notif_payload JSONB;
BEGIN
    -- 4.1 Identify Action Caller (Actor)
    IF (TG_OP = 'DELETE') THEN
        v_actor_id := COALESCE(auth.uid(), OLD.creator_id);
    ELSE
        v_actor_id := COALESCE(auth.uid(), NEW.creator_id);
    END IF;
    SELECT full_name INTO v_actor_name FROM public.user_master WHERE id = v_actor_id;
    IF v_actor_name IS NULL THEN
        v_actor_name := 'System Operator';
    END IF;

    -- 4.2 Determine Lifecycle Operation
    IF (TG_OP = 'INSERT') THEN
        v_operation := 'CREATE';
    ELSIF (TG_OP = 'DELETE') THEN
        v_operation := 'DELETE';
    ELSE
        IF (NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE) THEN
            v_operation := 'DELETE';
        ELSE
            v_operation := 'UPDATE';
        END IF;
    END IF;

    -- 4.3 Resolve Creator Identity
    IF TG_OP <> 'DELETE' THEN
        SELECT email, full_name INTO v_creator_email, v_creator_name FROM public.user_master WHERE id = NEW.creator_id;
    ELSE
        SELECT email, full_name INTO v_creator_email, v_creator_name FROM public.user_master WHERE id = OLD.creator_id;
    END IF;

    -- 4.4 Resolve Assignee Identity
    IF TG_OP <> 'DELETE' AND NEW.assignee_id IS NOT NULL THEN
        SELECT email, full_name INTO v_assignee_email, v_assignee_name FROM public.user_master WHERE id = NEW.assignee_id;
    ELSIF TG_OP = 'DELETE' AND OLD.assignee_id IS NOT NULL THEN
        SELECT email, full_name INTO v_assignee_email, v_assignee_name FROM public.user_master WHERE id = OLD.assignee_id;
    END IF;

    -- 4.5 Populate Standalone Immutable Audit Logs
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.ticket_audit_logs (ticket_id, actor_id, operation, before_values, after_values)
        VALUES (NEW.id, v_actor_id, 'CREATE', NULL, to_jsonb(NEW));
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.ticket_audit_logs (ticket_id, actor_id, operation, before_values, after_values)
        VALUES (OLD.id, v_actor_id, 'DELETE', to_jsonb(OLD), NULL);
    ELSE
        INSERT INTO public.ticket_audit_logs (ticket_id, actor_id, operation, before_values, after_values)
        VALUES (NEW.id, v_actor_id, v_operation, to_jsonb(OLD), to_jsonb(NEW));
    END IF;

    -- 4.6 Publish Event Notification & Email templates
    IF (v_operation = 'CREATE') THEN
        v_subject := 'Ticket Initialized: [' || NEW.code || '] ' || NEW.title;
        v_body := 'Hello ' || COALESCE(v_creator_name, 'User') || ', your ticket ' || NEW.code || ' has been successfully created and added to our operations stream.';
        v_notif_payload := jsonb_build_object(
            'ticket_id', NEW.id,
            'code', NEW.code,
            'type', 'CREATE',
            'actor', v_actor_name,
            'message', 'Ticket ' || NEW.code || ' created by ' || v_actor_name
        );

        -- Queue System Notification for creator
        INSERT INTO public.notification_queue (recipient_id, payload) VALUES (NEW.creator_id, v_notif_payload);
        IF v_creator_email IS NOT NULL THEN
            INSERT INTO public.email_queue (recipient_email, subject, body_template) VALUES (v_creator_email, v_subject, v_body);
        END IF;

        -- Queue System Notification for assignee if assigned upon creation
        IF NEW.assignee_id IS NOT NULL THEN
            INSERT INTO public.notification_queue (recipient_id, payload) VALUES (NEW.assignee_id, v_notif_payload);
            IF v_assignee_email IS NOT NULL THEN
                INSERT INTO public.email_queue (recipient_email, subject, body_template)
                VALUES (v_assignee_email, 'Assigned Ticket: [' || NEW.code || ']', 'You have been assigned to ticket ' || NEW.code || ': ' || NEW.title);
            END IF;
        END IF;

    ELSIF (v_operation = 'DELETE') THEN
        v_subject := 'Ticket Purged: [' || OLD.code || '] ' || OLD.title;
        v_body := 'Ticket ' || OLD.code || ' has been moved to the deleted operational lifecycle by ' || v_actor_name || '.';
        v_notif_payload := jsonb_build_object(
            'ticket_id', OLD.id,
            'code', OLD.code,
            'type', 'DELETE',
            'actor', v_actor_name,
            'message', 'Ticket ' || OLD.code || ' has been purged by ' || v_actor_name
        );

        -- Notify Creator
        INSERT INTO public.notification_queue (recipient_id, payload) VALUES (OLD.creator_id, v_notif_payload);
        IF v_creator_email IS NOT NULL THEN
            INSERT INTO public.email_queue (recipient_email, subject, body_template) VALUES (v_creator_email, v_subject, v_body);
        END IF;

        -- Notify Assignee
        IF OLD.assignee_id IS NOT NULL THEN
            INSERT INTO public.notification_queue (recipient_id, payload) VALUES (OLD.assignee_id, v_notif_payload);
            IF v_assignee_email IS NOT NULL THEN
                INSERT INTO public.email_queue (recipient_email, subject, body_template) VALUES (v_assignee_email, v_subject, v_body);
            END IF;
        END IF;

    ELSIF (v_operation = 'UPDATE') THEN
        -- Check Status Change
        IF (OLD.status_id IS DISTINCT FROM NEW.status_id) THEN
            SELECT name INTO v_old_status_name FROM public.workflow_states WHERE id = OLD.status_id;
            SELECT name INTO v_new_status_name FROM public.workflow_states WHERE id = NEW.status_id;
            
            v_subject := 'Status Changed: [' || NEW.code || '] from ' || COALESCE(v_old_status_name, 'Unknown') || ' to ' || COALESCE(v_new_status_name, 'Unknown');
            v_body := 'Hello, the status of ticket ' || NEW.code || ' (' || NEW.title || ') has been transitioned by ' || v_actor_name || ' to ' || COALESCE(v_new_status_name, 'Unknown') || '.';
            v_notif_payload := jsonb_build_object(
                'ticket_id', NEW.id,
                'code', NEW.code,
                'type', 'STATUS_CHANGE',
                'old_status', v_old_status_name,
                'new_status', v_new_status_name,
                'message', 'Ticket ' || NEW.code || ' status changed to ' || v_new_status_name || ' by ' || v_actor_name
            );

            -- Notify Creator
            INSERT INTO public.notification_queue (recipient_id, payload) VALUES (NEW.creator_id, v_notif_payload);
            IF v_creator_email IS NOT NULL THEN
                INSERT INTO public.email_queue (recipient_email, subject, body_template) VALUES (v_creator_email, v_subject, v_body);
            END IF;

            -- Notify Assignee
            IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id IS DISTINCT FROM NEW.creator_id THEN
                INSERT INTO public.notification_queue (recipient_id, payload) VALUES (NEW.assignee_id, v_notif_payload);
                IF v_assignee_email IS NOT NULL THEN
                    INSERT INTO public.email_queue (recipient_email, subject, body_template) VALUES (v_assignee_email, v_subject, v_body);
                END IF;
            END IF;
        END IF;

        -- Check Assignee Change
        IF (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
            v_subject := 'Assignee Updated: [' || NEW.code || '] Assigned to ' || COALESCE(v_assignee_name, 'Unassigned');
            v_body := 'Ticket ' || NEW.code || ' (' || NEW.title || ') has been assigned to ' || COALESCE(v_assignee_name, 'Unassigned') || ' by ' || v_actor_name || '.';
            v_notif_payload := jsonb_build_object(
                'ticket_id', NEW.id,
                'code', NEW.code,
                'type', 'ASSIGN',
                'assignee', v_assignee_name,
                'message', 'Ticket ' || NEW.code || ' assigned to ' || COALESCE(v_assignee_name, 'Unassigned') || ' by ' || v_actor_name
            );

            -- Notify Creator
            INSERT INTO public.notification_queue (recipient_id, payload) VALUES (NEW.creator_id, v_notif_payload);
            IF v_creator_email IS NOT NULL THEN
                INSERT INTO public.email_queue (recipient_email, subject, body_template) VALUES (v_creator_email, v_subject, v_body);
            END IF;

            -- Notify New Assignee
            IF NEW.assignee_id IS NOT NULL THEN
                INSERT INTO public.notification_queue (recipient_id, payload) VALUES (NEW.assignee_id, v_notif_payload);
                IF v_assignee_email IS NOT NULL THEN
                    INSERT INTO public.email_queue (recipient_email, subject, body_template) VALUES (v_assignee_email, v_subject, v_body);
                END IF;
            END IF;
            
            -- Notify Old Assignee
            IF OLD.assignee_id IS NOT NULL AND OLD.assignee_id IS DISTINCT FROM NEW.assignee_id AND OLD.assignee_id IS DISTINCT FROM NEW.creator_id THEN
                INSERT INTO public.notification_queue (recipient_id, payload) VALUES (OLD.assignee_id, v_notif_payload);
            END IF;
        END IF;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. BIND AUTOMATED TRIGGER TO TICKETS LIFECYCLE
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS tr_on_ticket_lifecycle ON public.tickets;
CREATE TRIGGER tr_on_ticket_lifecycle
    AFTER INSERT OR UPDATE OR DELETE ON public.tickets
    FOR EACH ROW EXECUTE FUNCTION public.handle_ticket_lifecycle();
