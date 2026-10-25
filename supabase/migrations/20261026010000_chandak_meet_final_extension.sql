-- ==============================================================================
-- Migration: 20261026010000_chandak_meet_final_extension.sql
-- Description: Chandak Meet - Final Extension: Notes, Module Admin, SLA, RSVP, AI MoM & Room Displays
-- Specification: D:\adios\Chandak Meet\CHANDAK_WORKSPACE_MEET_FINAL_SPEC.md (v6.0)
-- ==============================================================================

-- 1. Part D: Notes Module Schema
CREATE TABLE IF NOT EXISTS public.meet_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind TEXT NOT NULL DEFAULT 'session' CHECK (kind IN ('session', 'personal')),
    session_id UUID REFERENCES public.meet_sessions(id) ON DELETE CASCADE,
    meeting_id UUID REFERENCES public.meet_meetings(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'meeting' CHECK (visibility IN ('meeting', 'private', 'shared')),
    pinned BOOLEAN NOT NULL DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    locked_at TIMESTAMPTZ,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_meet_notes_session 
    ON public.meet_notes(session_id) 
    WHERE kind = 'session' AND session_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.meet_note_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.meet_notes(id) ON DELETE CASCADE,
    position INT NOT NULL DEFAULT 0,
    type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'todo', 'heading', 'addendum')),
    text TEXT NOT NULL DEFAULT '',
    done BOOLEAN NOT NULL DEFAULT false,
    author_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    point_id UUID REFERENCES public.meet_points(id) ON DELETE SET NULL,
    linked_type TEXT CHECK (linked_type IN ('point', 'task', 'decision')),
    linked_id UUID,
    not_action BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meet_note_blocks_note_pos ON public.meet_note_blocks(note_id, position);
CREATE INDEX IF NOT EXISTS idx_meet_note_blocks_point ON public.meet_note_blocks(point_id);
CREATE INDEX IF NOT EXISTS idx_meet_note_blocks_link ON public.meet_note_blocks(linked_type, linked_id);

CREATE TABLE IF NOT EXISTS public.meet_note_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.meet_notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_master(id) ON DELETE CASCADE,
    can_edit BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_meet_note_shares UNIQUE(note_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.meet_note_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.meet_notes(id) ON DELETE CASCADE,
    block_id UUID,
    author_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    at TIMESTAMPTZ NOT NULL DEFAULT now(),
    diff_json JSONB
);

-- Two-way linkage columns
ALTER TABLE public.meet_points ADD COLUMN IF NOT EXISTS source_note_block_id UUID REFERENCES public.meet_note_blocks(id) ON DELETE SET NULL;
ALTER TABLE public.meet_tasks ADD COLUMN IF NOT EXISTS source_note_block_id UUID REFERENCES public.meet_note_blocks(id) ON DELETE SET NULL;
ALTER TABLE public.meet_decisions ADD COLUMN IF NOT EXISTS source_note_block_id UUID REFERENCES public.meet_note_blocks(id) ON DELETE SET NULL;

-- 2. Part E: Module Settings, Templates, Alert Rules & SLA
CREATE TABLE IF NOT EXISTS public.core_module_settings (
    module_key TEXT NOT NULL,
    key TEXT NOT NULL,
    value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (module_key, key)
);

CREATE TABLE IF NOT EXISTS public.core_notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_key TEXT NOT NULL DEFAULT 'meet',
    key TEXT NOT NULL,
    name TEXT NOT NULL,
    event_key TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'email',
    language TEXT NOT NULL DEFAULT 'en',
    subject TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    attach_mom BOOLEAN NOT NULL DEFAULT false,
    version INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    wa_template_name TEXT,
    wa_status TEXT,
    updated_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_core_templates UNIQUE (module_key, key, channel, language)
);

CREATE TABLE IF NOT EXISTS public.meet_alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    event_key TEXT,
    schedule_cron TEXT,
    conditions_json JSONB DEFAULT '{}'::jsonb,
    recipients_json JSONB DEFAULT '[]'::jsonb,
    channels TEXT[] DEFAULT '{email}',
    timing TEXT DEFAULT 'immediate',
    template_key TEXT,
    throttle_hours INT DEFAULT 4,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meet_sla_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    applies_to_json JSONB DEFAULT '{}'::jsonb,
    time_limit_hours INT DEFAULT 48,
    time_limit_unit TEXT DEFAULT 'working_days',
    reminders_json JSONB DEFAULT '[]'::jsonb,
    warning_percent INT DEFAULT 50,
    escalation_steps_json JSONB DEFAULT '[]'::jsonb,
    channels TEXT[] DEFAULT '{email,whatsapp}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meet_sla_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type TEXT NOT NULL, -- 'point' | 'task' | 'session' | 'invite' | 'mom'
    item_id UUID NOT NULL,
    policy_id UUID REFERENCES public.meet_sla_policies(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_at TIMESTAMPTZ NOT NULL,
    state TEXT NOT NULL DEFAULT 'ok', -- 'ok' | 'warning' | 'breached' | 'met'
    current_level INT NOT NULL DEFAULT 1,
    escalated_to_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    escalated_at TIMESTAMPTZ,
    next_check_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    delay_working_hours NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meet_sla_check ON public.meet_sla_instances(next_check_at) WHERE state IN ('ok', 'warning');
CREATE INDEX IF NOT EXISTS idx_meet_sla_item ON public.meet_sla_instances(item_type, item_id);

-- 3. Part E: RSVP & Attendance & AI MoM
CREATE TABLE IF NOT EXISTS public.meet_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.meet_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_master(id) ON DELETE CASCADE,
    response TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'tentative' | 'declined' | 'proposed'
    responded_at TIMESTAMPTZ,
    note TEXT,
    delegate_user_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    proposed_start TIMESTAMPTZ,
    channel TEXT DEFAULT 'app',
    reminder_count INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_meet_invitations UNIQUE (session_id, user_id)
);

-- Attendance enhancements
ALTER TABLE public.meet_session_attendees ADD COLUMN IF NOT EXISTS check_in_method TEXT DEFAULT 'manual';
ALTER TABLE public.meet_session_attendees ADD COLUMN IF NOT EXISTS late_minutes INT DEFAULT 0;
ALTER TABLE public.meet_session_attendees ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;
ALTER TABLE public.meet_session_attendees ADD COLUMN IF NOT EXISTS marked_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.meet_ai_minutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.meet_sessions(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    overview TEXT,
    items_json JSONB DEFAULT '[]'::jsonb,
    model TEXT DEFAULT 'gemini-1.5-pro',
    mode TEXT NOT NULL DEFAULT 'review', -- 'review' | 'auto_send' | 'off'
    approved_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Part F: Rooms, Bookings & Display Devices
ALTER TABLE public.meet_rooms ADD COLUMN IF NOT EXISTS m365_email TEXT UNIQUE;
ALTER TABLE public.meet_rooms ADD COLUMN IF NOT EXISTS m365_place_id TEXT;
ALTER TABLE public.meet_rooms ADD COLUMN IF NOT EXISTS display_type TEXT DEFAULT 'chandak_display';
ALTER TABLE public.meet_rooms ADD COLUMN IF NOT EXISTS bookable_by_json JSONB DEFAULT '{"all": true}'::jsonb;
ALTER TABLE public.meet_rooms ADD COLUMN IF NOT EXISTS approval_user_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL;
ALTER TABLE public.meet_rooms ADD COLUMN IF NOT EXISTS max_duration_min INT DEFAULT 240;
ALTER TABLE public.meet_rooms ADD COLUMN IF NOT EXISTS booking_window_days INT DEFAULT 90;
ALTER TABLE public.meet_rooms ADD COLUMN IF NOT EXISTS buffer_min INT DEFAULT 10;
ALTER TABLE public.meet_rooms ADD COLUMN IF NOT EXISTS checkin_required BOOLEAN DEFAULT true;
ALTER TABLE public.meet_rooms ADD COLUMN IF NOT EXISTS release_after_min INT DEFAULT 10;
ALTER TABLE public.meet_rooms ADD COLUMN IF NOT EXISTS show_subject BOOLEAN DEFAULT true;
ALTER TABLE public.meet_rooms ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.meet_rooms ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS public.meet_room_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.meet_sessions(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.meet_rooms(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed', -- 'pending' | 'confirmed' | 'tentative' | 'declined' | 'checked_in' | 'released' | 'ended' | 'cancelled'
    external_event_id TEXT,
    ical_uid TEXT,
    teams_join_url TEXT,
    booked_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    checked_in_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ,
    sync_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meet_room_bookings_room_time ON public.meet_room_bookings(room_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_meet_room_bookings_session ON public.meet_room_bookings(session_id);

CREATE TABLE IF NOT EXISTS public.meet_room_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.meet_rooms(id) ON DELETE CASCADE,
    device_token_hash TEXT NOT NULL,
    label TEXT,
    paired_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    paired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

-- Enable RLS across all new tables
ALTER TABLE public.meet_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_note_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_note_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_note_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_module_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_sla_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_ai_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_room_devices ENABLE ROW LEVEL SECURITY;

-- Permissive policies for internal workspace users
DO $$ 
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'meet_notes', 'meet_note_blocks', 'meet_note_shares', 'meet_note_versions',
        'core_module_settings', 'core_notification_templates', 'meet_alert_rules',
        'meet_sla_policies', 'meet_sla_instances', 'meet_invitations',
        'meet_ai_minutes', 'meet_room_bookings', 'meet_room_devices'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I_all_auth ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY %I_all_auth ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;

-- 5. Seed Default Module Notification Templates & SLA Policies
INSERT INTO public.core_notification_templates (module_key, key, name, event_key, channel, subject, body, attach_mom)
VALUES 
    ('meet', 'meet_invitation', 'Meeting Invitation', 'meet.session.invited', 'email', 'Invitation: {{meeting.title}} ({{session.date}})', 'Hello {{user.first_name}},\n\nYou have been invited to {{meeting.title}} scheduled on {{session.date}} from {{session.time}} at {{session.venue}}.\n\nPlease confirm your attendance below:\n[Accept] [Tentative] [Decline]\n\nAgenda:\n{{agenda}}\n\nChandak Meet Management', false),
    ('meet', 'mom_published', 'MoM Published', 'meet.mom.published', 'email', 'Minutes of Meeting: {{meeting.title}} - {{session.code}}', 'Hello {{user.first_name}},\n\nThe Minutes of Meeting for {{meeting.title}} (Session {{session.code}}) have been finalized and published.\n\nPlease review the attached official MoM document and acknowledge receipt.\n\n[View & Acknowledge MoM]\n\nChandak Meet System', true),
    ('meet', 'task_assigned', 'Task Assigned', 'meet.task.assigned', 'email', 'New Action Item: {{item.code}} - {{item.title}}', 'Hello {{user.first_name}},\n\nYou have been assigned action item {{item.code}}: {{item.title}} with due date {{item.due}}.\n\nPriority: {{item.priority}}\nTAT: {{item.tat_days}} working days.\n\n[Open Task & Update Progress]\n\nChandak Meet System', false),
    ('meet', 'sla_warning', 'SLA Approaching Warning', 'meet.sla.warning', 'email', 'Warning: Action Item {{item.code}} reaching TAT limit', 'Hello {{user.first_name}},\n\nAction item {{item.code}} ({{item.title}}) is at 50% TAT without progress updates. Statutory due date is {{item.due}}.\n\n[Update Now]\n\nChandak Meet SLA Monitor', false)
ON CONFLICT (module_key, key, channel, language) DO UPDATE SET
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    body = EXCLUDED.body,
    attach_mom = EXCLUDED.attach_mom;

INSERT INTO public.meet_sla_policies (name, applies_to_json, time_limit_hours, time_limit_unit, warning_percent, escalation_steps_json)
VALUES 
    ('Critical Points & Tasks', '{"priority": "critical"}'::jsonb, 48, 'working_days', 50, '[{"level": 1, "offset_days": 0, "role": "owner"}, {"level": 2, "offset_days": 1, "role": "manager"}, {"level": 3, "offset_days": 2, "role": "dept_head"}, {"level": 4, "offset_days": 4, "role": "management"}]'::jsonb),
    ('High Priority Items', '{"priority": "high"}'::jsonb, 72, 'working_days', 75, '[{"level": 1, "offset_days": 0, "role": "owner"}, {"level": 2, "offset_days": 3, "role": "manager"}, {"level": 3, "offset_days": 5, "role": "dept_head"}, {"level": 4, "offset_days": 10, "role": "management"}]'::jsonb),
    ('Standard Routine Action Items', '{"priority": "medium"}'::jsonb, 120, 'working_days', 50, '[{"level": 1, "offset_days": 1, "role": "owner"}, {"level": 2, "offset_days": 4, "role": "manager"}, {"level": 3, "offset_days": 6, "role": "dept_head"}]'::jsonb)
ON CONFLICT DO NOTHING;

-- Seed default policy settings
INSERT INTO public.core_module_settings (module_key, key, value_json)
VALUES 
    ('meet', 'policies', '{
        "who_can_create": "all_meet_users",
        "attendees_can_add_points": true,
        "attendees_can_write_notes": true,
        "dept_heads_see_all": true,
        "mom_needs_chair_approval": false,
        "who_approves_extensions": "organizer",
        "max_attendees": 100,
        "checkin_release_minutes": 10
    }'::jsonb)
ON CONFLICT (module_key, key) DO UPDATE SET
    value_json = EXCLUDED.value_json;
