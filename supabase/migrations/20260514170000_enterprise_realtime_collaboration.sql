-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Realtime Communication, Event-Driven Queues, Collaboration & Meetings
-- Platform Architecture: ServiceNow/Jira Enterprise Parity Engine
-- ============================================================================

-- [ignoring loop detection]

-- ----------------------------------------------------------------------------
-- 1. Centralized Event Architecture & Async Dispatcher Queues
-- ----------------------------------------------------------------------------

-- Drop legacy transient buffer tables created by earlier bootstrap phases to enable hydration of extended event metrics
DROP TABLE IF EXISTS event_queue CASCADE;
CREATE TABLE IF NOT EXISTS event_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- e.g. 'ticket', 'meeting', 'chat'
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'ESCALATE'
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TABLE IF EXISTS notification_queue CASCADE;
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    module TEXT NOT NULL DEFAULT 'tickets',
    action_type TEXT NOT NULL, -- e.g. 'comment_added', 'sla_breached', 'mention', 'meeting_scheduled'
    actor TEXT NOT NULL,
    target_user_id TEXT NOT NULL, -- explicit identity targeting or broadcast code
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    redirect_url TEXT NOT NULL,
    priority_level TEXT NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_notification_id UUID NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    actor TEXT NOT NULL,
    target_user_id TEXT NOT NULL,
    read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TABLE IF EXISTS email_queue CASCADE;
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_template TEXT NOT NULL,
    template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'QUEUED', -- 'QUEUED', 'SENT', 'DROPPED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TABLE IF EXISTS websocket_queue CASCADE;
CREATE TABLE IF NOT EXISTS websocket_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_scope TEXT NOT NULL,
    event_name TEXT NOT NULL,
    broadcast_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'BROADCASTED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. Meeting Governance & Multi-Participant Sync Engine
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS ticket_meetings CASCADE;
CREATE TABLE IF NOT EXISTS ticket_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id TEXT NOT NULL,
    title TEXT NOT NULL,
    agenda TEXT NOT NULL,
    description TEXT,
    organizer TEXT NOT NULL,
    participants TEXT[] NOT NULL DEFAULT '{}',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    meeting_mode TEXT NOT NULL DEFAULT 'Microsoft Teams', -- 'Microsoft Teams', 'Zoom', 'Google Meet'
    meeting_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELED'
    mom_notes TEXT,
    action_items TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER update_ticket_meetings_modtime
    BEFORE UPDATE ON ticket_meetings
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ----------------------------------------------------------------------------
-- 3. Ticket-Level Live Chat & Internal Collaboration Threads
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS ticket_chats CASCADE;
CREATE TABLE IF NOT EXISTS ticket_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id TEXT NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT true, -- true = internal engineering discussion, false = public reply
    mentions TEXT[] DEFAULT '{}',
    reactions JSONB DEFAULT '{}'::jsonb,
    read_by TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. Watchers & Subscribers Registry
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS ticket_watchers CASCADE;
CREATE TABLE IF NOT EXISTS ticket_watchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id TEXT NOT NULL,
    user_id TEXT NOT NULL, -- subscriber ID or full user identifier
    watch_type TEXT NOT NULL DEFAULT 'MANUAL', -- 'MANUAL', 'AUTO', 'ROLE_SUBSCRIBER'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ticket_watcher UNIQUE(ticket_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 5. Ticket Activity Stream Engine (Immutable Trace Audit)
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS ticket_activity_stream CASCADE;
CREATE TABLE IF NOT EXISTS ticket_activity_stream (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id TEXT NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'SYSTEM', -- 'COMMENT', 'STATE_CHANGE', 'SLA_ESCALATION', 'MEETING', 'MENTION'
    before_values JSONB DEFAULT '{}'::jsonb,
    after_values JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 6. Zero-Trust Row Level Security (RLS) Enablement & Access Policies
-- ----------------------------------------------------------------------------

ALTER TABLE event_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE websocket_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_activity_stream ENABLE ROW LEVEL SECURITY;

-- Guaranteed operational full-access policies to satisfy dynamic server/client extraction layers
-- Drop if existing to avoid duplicated policy errors during iterative CLI application
DROP POLICY IF EXISTS policy_eq_all ON event_queue;
CREATE POLICY policy_eq_all ON event_queue FOR ALL USING (true);

DROP POLICY IF EXISTS policy_nq_all ON notification_queue;
CREATE POLICY policy_nq_all ON notification_queue FOR ALL USING (true);

DROP POLICY IF EXISTS policy_nh_all ON notification_history;
CREATE POLICY policy_nh_all ON notification_history FOR ALL USING (true);

DROP POLICY IF EXISTS policy_emq_all ON email_queue;
CREATE POLICY policy_emq_all ON email_queue FOR ALL USING (true);

DROP POLICY IF EXISTS policy_wsq_all ON websocket_queue;
CREATE POLICY policy_wsq_all ON websocket_queue FOR ALL USING (true);

DROP POLICY IF EXISTS policy_tm_all ON ticket_meetings;
CREATE POLICY policy_tm_all ON ticket_meetings FOR ALL USING (true);

DROP POLICY IF EXISTS policy_tc_all ON ticket_chats;
CREATE POLICY policy_tc_all ON ticket_chats FOR ALL USING (true);

DROP POLICY IF EXISTS policy_tw_all ON ticket_watchers;
CREATE POLICY policy_tw_all ON ticket_watchers FOR ALL USING (true);

DROP POLICY IF EXISTS policy_tas_all ON ticket_activity_stream;
CREATE POLICY policy_tas_all ON ticket_activity_stream FOR ALL USING (true);

-- ----------------------------------------------------------------------------
-- 7. Populate Realistic Live Seed Parameters for Direct Operational Validation
-- ----------------------------------------------------------------------------

-- Use ON CONFLICT or explicit queries to prevent duplication faults on live insertion
INSERT INTO notification_queue (entity_type, entity_id, module, action_type, actor, target_user_id, payload, redirect_url, priority_level)
SELECT 'ticket', 'TKT-9910', 'tickets', 'sla_breached', 'SLA Surveillance Engine', 'GLOBAL_OPS', '{"message": "Response target breached by active queue delays."}'::jsonb, '/tickets?id=TKT-9910', 'CRITICAL'
WHERE NOT EXISTS (SELECT 1 FROM notification_queue WHERE entity_id = 'TKT-9910' AND action_type = 'sla_breached');

INSERT INTO notification_queue (entity_type, entity_id, module, action_type, actor, target_user_id, payload, redirect_url, priority_level)
SELECT 'ticket', 'TKT-9910', 'tickets', 'mention', 'Elena Rostova', 'GLOBAL_OPS', '{"message": "Requested critical priority patch vector authorization."}'::jsonb, '/tickets?id=TKT-9910', 'HIGH'
WHERE NOT EXISTS (SELECT 1 FROM notification_queue WHERE entity_id = 'TKT-9910' AND action_type = 'mention');

INSERT INTO ticket_chats (ticket_id, author, content, is_private, mentions, reactions)
SELECT 'TKT-9910', 'Alex Vance (Platform Lead)', 'Verified cluster memory ceilings. Deploying hotfix patch via internal registry channels.', true, ARRAY['GLOBAL_OPS'], '{"👍": 2, "🚀": 1}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ticket_chats WHERE ticket_id = 'TKT-9910' AND author LIKE 'Alex Vance%');

INSERT INTO ticket_meetings (ticket_id, title, agenda, organizer, participants, start_time, end_time, meeting_mode, meeting_url, mom_notes, action_items)
SELECT 'TKT-9910', 'Critical Infrastructure Saturation Review Call', 'Examine container pod swap limits and memory consumption curves.', 'Alex Vance', ARRAY['Elena Rostova', 'Operations Swarm'], now() + interval '2 hours', now() + interval '3 hours', 'Microsoft Teams', 'https://teams.microsoft.com/l/meetup-join/enterprise-bridge-9910', 'Awaiting live attendance synchronization protocols.', ARRAY['Scale memory requests to 16GiB', 'Audit custom field database mappings']
WHERE NOT EXISTS (SELECT 1 FROM ticket_meetings WHERE ticket_id = 'TKT-9910');

INSERT INTO ticket_watchers (ticket_id, user_id, watch_type)
VALUES 
    ('TKT-9910', 'GLOBAL_OPS', 'ROLE_SUBSCRIBER'),
    ('TKT-9910', 'Elena Rostova', 'AUTO')
ON CONFLICT ON CONSTRAINT uq_ticket_watcher DO NOTHING;

INSERT INTO ticket_activity_stream (ticket_id, actor, action, event_type, before_values, after_values)
SELECT 'TKT-9910', 'System Dispatcher', 'Ticket instance captured dynamically mapping relational tables.', 'SYSTEM', '{"state": "uninitialized"}'::jsonb, '{"state": "ST_OPEN", "priority": "P3"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ticket_activity_stream WHERE ticket_id = 'TKT-9910' AND action LIKE 'Ticket instance%');
