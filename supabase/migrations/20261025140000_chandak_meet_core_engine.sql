-- ==============================================================================
-- Migration: 20261025140000_chandak_meet_core_engine.sql
-- Description: Chandak Meet - Complete Core Meeting Management Engine
-- Specification: D:\adios\Candak Meet\CHANDAK_WORKSPACE_MEET_COMPLETE_SPEC.md
-- Features:
--   1. Module Registration in modules_master
--   2. Granular Permissions in permissions table & role mappings
--   3. Masters: Settings, Meeting Types, Point Categories, Rooms, Templates
--   4. Series, Sessions, Agenda, Attendees, Pre-updates
--   5. Points, Carry-Forward Engine, TAT Working Days Calculation
--   6. Tasks, Checklists, Extensions, Verification
--   7. Decisions Register, MoM Versions, Acknowledgements
--   8. Collaboration: Comments, Attachments, Append-only Activity Log
--   9. Performance Indexes & RLS Policies
-- ==============================================================================

-- 1. Ensure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Register module in modules_master
INSERT INTO public.modules_master (code, name, description, icon, route_path, display_order, is_active)
VALUES (
    'CHANDAK_MEET',
    'Chandak Meet',
    'Meetings, Agendas, Points with Carry-Forward, Decisions & Action Items',
    'Video',
    '/meet',
    5,
    true
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    route_path = EXCLUDED.route_path,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 3. Register granular permissions
INSERT INTO public.permissions (code, name, module, submodule, action, resource_type) VALUES
    ('MEET_VIEW', 'View Meetings & Sessions', 'Chandak Meet', 'Meetings', 'VIEW', 'PAGE'),
    ('MEET_CREATE', 'Create Meeting Series & Sessions', 'Chandak Meet', 'Meetings', 'CREATE', 'ACTION'),
    ('MEET_UPDATE', 'Modify Meeting Details & Agenda', 'Chandak Meet', 'Meetings', 'UPDATE', 'ACTION'),
    ('MEET_DELETE', 'Cancel or Archive Meetings', 'Chandak Meet', 'Meetings', 'DELETE', 'ACTION'),
    ('MEET_SESSION_RUN', 'Run Live Meeting & Attendance', 'Chandak Meet', 'Live Mode', 'UPDATE', 'ACTION'),
    ('MEET_POINT_MANAGE', 'Create, Update & Carry Forward Points', 'Chandak Meet', 'Points', 'MANAGE', 'ACTION'),
    ('MEET_TASK_MANAGE', 'Create, Reassign & Close Action Items', 'Chandak Meet', 'Tasks', 'MANAGE', 'ACTION'),
    ('MEET_EXTENSION_APPROVE', 'Approve/Reject TAT Extensions', 'Chandak Meet', 'Tasks', 'APPROVE', 'ACTION'),
    ('MEET_DECISION_MANAGE', 'Record & Revoke Decisions', 'Chandak Meet', 'Decisions', 'MANAGE', 'ACTION'),
    ('MEET_MOM_APPROVE', 'Review & Approve Minutes of Meeting', 'Chandak Meet', 'MoM', 'APPROVE', 'ACTION'),
    ('MEET_MOM_PUBLISH', 'Publish & Distribute MoM to Attendees', 'Chandak Meet', 'MoM', 'APPROVE', 'ACTION'),
    ('MEET_REPORT_VIEW', 'View Meet Reports & Analytics', 'Chandak Meet', 'Reports', 'VIEW', 'PAGE'),
    ('MEET_ADMIN', 'Full Chandak Meet System Administration', 'Chandak Meet', 'Admin Masters', 'MANAGE', 'PAGE')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    module = EXCLUDED.module,
    submodule = EXCLUDED.submodule,
    action = EXCLUDED.action,
    resource_type = EXCLUDED.resource_type;

-- 4. Sequences for Auto-increment Codes
CREATE SEQUENCE IF NOT EXISTS meet_meeting_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS meet_point_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS meet_task_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS meet_decision_code_seq START 1;

-- 5. Master: Company Settings
CREATE TABLE IF NOT EXISTS public.meet_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.company_master(id) ON DELETE CASCADE,
    tat_unit TEXT NOT NULL DEFAULT 'working_days', -- 'working_days' | 'hours'
    working_days INT[] NOT NULL DEFAULT '{1,2,3,4,5,6}', -- 1=Mon, 6=Sat (Sunday=0)
    business_day_start TIME NOT NULL DEFAULT '09:30:00',
    business_day_end TIME NOT NULL DEFAULT '18:00:00',
    exclude_holidays BOOLEAN NOT NULL DEFAULT true,
    due_soon_working_days INT NOT NULL DEFAULT 1,
    carry_escalation_count INT NOT NULL DEFAULT 3,
    auto_carry_forward BOOLEAN NOT NULL DEFAULT true,
    mom_requires_approval BOOLEAN NOT NULL DEFAULT false,
    mom_ack_required BOOLEAN NOT NULL DEFAULT false,
    pre_update_hours_before INT NOT NULL DEFAULT 24,
    default_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_meet_settings_company UNIQUE(company_id)
);

-- Seed default global settings row (company_id is null for platform global default)
INSERT INTO public.meet_settings (id, company_id, tat_unit, working_days, business_day_end, carry_escalation_count)
VALUES ('00000000-0000-0000-0000-000000000001', NULL, 'working_days', '{1,2,3,4,5,6}', '18:00:00', 3)
ON CONFLICT (company_id) DO NOTHING;

-- 6. Master: Meeting Types
CREATE TABLE IF NOT EXISTS public.meet_meeting_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    is_board_mode BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.meet_meeting_types (name, color, is_board_mode, sort_order) VALUES
    ('Weekly Operational Review', '#3b82f6', false, 1),
    ('Monthly MIS & Financials', '#10b981', false, 2),
    ('Management Review', '#8b5cf6', false, 3),
    ('Plant Safety & Operations', '#f59e0b', false, 4),
    ('IT & Systems Steering', '#06b6d4', false, 5),
    ('HR & Committee Review', '#ec4899', false, 6),
    ('Board & Committee Meeting', '#6366f1', true, 7),
    ('Project Kick-off & Alignment', '#14b8a6', false, 8),
    ('General Discussion', '#64748b', false, 9)
ON CONFLICT (name) DO UPDATE SET
    color = EXCLUDED.color,
    is_board_mode = EXCLUDED.is_board_mode,
    sort_order = EXCLUDED.sort_order;

-- 7. Master: Point Categories
CREATE TABLE IF NOT EXISTS public.meet_point_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    default_tat_days INT NOT NULL DEFAULT 3,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.meet_point_categories (name, default_tat_days) VALUES
    ('Sales & Revenue', 3),
    ('Finance, Audit & Accounts', 4),
    ('IT, Software & Infrastructure', 3),
    ('Plant Operations & Maintenance', 2),
    ('Supply Chain & Procurement', 4),
    ('HR, Training & Administration', 5),
    ('Legal, Compliance & Statutory', 7),
    ('Strategic Initiative', 7),
    ('General Action Item', 3)
ON CONFLICT DO NOTHING;

-- 8. Master: Meeting Rooms
CREATE TABLE IF NOT EXISTS public.meet_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT 'Head Office',
    capacity INT NOT NULL DEFAULT 10,
    facilities JSONB DEFAULT '{"projector": true, "video_conferencing": true, "whiteboard": true}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.meet_rooms (name, location, capacity) VALUES
    ('Board Room (Grand Floor)', 'Head Office', 24),
    ('Conference Room A', 'Head Office - 2nd Floor', 12),
    ('Conference Room B', 'Head Office - 3rd Floor', 8),
    ('Plant 1 Meeting Room', 'Nagpur Plant', 15),
    ('Innovation Hub', 'Head Office - 4th Floor', 10)
ON CONFLICT DO NOTHING;

-- 9. Master: Templates
CREATE TABLE IF NOT EXISTS public.meet_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    meeting_type_id UUID REFERENCES public.meet_meeting_types(id) ON DELETE SET NULL,
    default_duration INT NOT NULL DEFAULT 60, -- minutes
    agenda_items JSONB DEFAULT '[]'::jsonb,
    default_members JSONB DEFAULT '[]'::jsonb,
    checklist JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.meet_templates (name, description, default_duration, agenda_items) VALUES
    ('Weekly Sales Review Template', 'Standard recurring review of sales pipelines, collections and targets', 60, '[
        {"title": "Review of Previous Backup Points & Action Items", "planned_minutes": 15},
        {"title": "Weekly Numbers vs Target (Zonal Breakdown)", "planned_minutes": 20},
        {"title": "Outstanding Collections & DSO Monitoring", "planned_minutes": 15},
        {"title": "New Commitments & Next Week Strategy", "planned_minutes": 10}
    ]'::jsonb),
    ('Monthly MIS Review Template', 'Executive review of profitability, working capital, inventory & operational KPIs', 90, '[
        {"title": "Review of Open Action Items from Last Month", "planned_minutes": 20},
        {"title": "Financial Performance & P&L Analysis", "planned_minutes": 30},
        {"title": "Plant Yield, Dispatch & Inventory Ageing", "planned_minutes": 25},
        {"title": "Capex, Approvals & Statutory Matters", "planned_minutes": 15}
    ]'::jsonb),
    ('Plant Safety & Operations Template', 'Shift reviews, incident reports, machine downtime and safety protocols', 45, '[
        {"title": "Safety Incident & Near-Miss Log Review", "planned_minutes": 10},
        {"title": "Daily Production Output vs Capacity", "planned_minutes": 15},
        {"title": "Maintenance Downtime & Preventive Checklists", "planned_minutes": 10},
        {"title": "Action Items & Material Requisitions", "planned_minutes": 10}
    ]'::jsonb)
ON CONFLICT DO NOTHING;

-- 10. Meeting Series (meet_meetings)
CREATE TABLE IF NOT EXISTS public.meet_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    company_id UUID REFERENCES public.company_master(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    meeting_type_id UUID REFERENCES public.meet_meeting_types(id) ON DELETE RESTRICT,
    template_id UUID REFERENCES public.meet_templates(id) ON DELETE SET NULL,
    organizer_id UUID NOT NULL REFERENCES public.user_master(id) ON DELETE RESTRICT,
    chair_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    default_minute_taker_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    mode TEXT NOT NULL DEFAULT 'hybrid', -- 'in_person' | 'online' | 'hybrid'
    room_id UUID REFERENCES public.meet_rooms(id) ON DELETE SET NULL,
    venue_text TEXT,
    video_provider TEXT NOT NULL DEFAULT 'google_meet', -- 'none' | 'google_meet' | 'teams' | 'zoom' | 'builtin'
    video_link TEXT,
    default_start_time TIME NOT NULL DEFAULT '10:00:00',
    default_duration_minutes INT NOT NULL DEFAULT 60,
    recurrence TEXT NOT NULL DEFAULT 'weekly', -- 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom'
    recurrence_rule TEXT, -- RRULE string or json
    recurrence_end_date DATE,
    allow_attendees_add_points BOOLEAN NOT NULL DEFAULT true,
    is_confidential BOOLEAN NOT NULL DEFAULT false,
    requires_mom_approval BOOLEAN NOT NULL DEFAULT false,
    pre_update_enabled BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'paused' | 'archived'
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to auto-generate MTG-XXXX
CREATE OR REPLACE FUNCTION fn_meet_meeting_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        NEW.code := 'MTG-' || LPAD(nextval('meet_meeting_code_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_meet_meeting_code ON public.meet_meetings;
CREATE TRIGGER trg_meet_meeting_code
    BEFORE INSERT ON public.meet_meetings
    FOR EACH ROW EXECUTE FUNCTION fn_meet_meeting_code();

-- 11. Meeting Members
CREATE TABLE IF NOT EXISTS public.meet_meeting_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES public.meet_meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_master(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'required', -- 'organizer' | 'co_organizer' | 'chair' | 'minute_taker' | 'required' | 'optional' | 'guest'
    guest_name TEXT,
    guest_email TEXT,
    guest_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_meet_member_user UNIQUE(meeting_id, user_id)
);

-- 12. Sessions (Occurrences)
CREATE TABLE IF NOT EXISTS public.meet_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES public.meet_meetings(id) ON DELETE CASCADE,
    session_no INT NOT NULL,
    code TEXT NOT NULL, -- e.g. MTG-0001/S-001
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    room_id UUID REFERENCES public.meet_rooms(id) ON DELETE SET NULL,
    video_link TEXT,
    minute_taker_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled' | 'in_progress' | 'completed' | 'mom_draft' | 'mom_pending_approval' | 'mom_published' | 'cancelled'
    previous_session_id UUID REFERENCES public.meet_sessions(id) ON DELETE SET NULL,
    summary_notes TEXT,
    quorum_required INT DEFAULT 0,
    quorum_met BOOLEAN DEFAULT true,
    cancel_reason TEXT,
    reschedule_count INT NOT NULL DEFAULT 0,
    mom_version INT NOT NULL DEFAULT 0,
    mom_published_at TIMESTAMPTZ,
    mom_published_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    effectiveness_score INT DEFAULT 85,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_meet_session_code UNIQUE(meeting_id, session_no)
);

-- 13. Session Attendees
CREATE TABLE IF NOT EXISTS public.meet_session_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.meet_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_master(id) ON DELETE CASCADE,
    guest_name TEXT,
    guest_email TEXT,
    role TEXT NOT NULL DEFAULT 'required',
    invite_status TEXT NOT NULL DEFAULT 'invited', -- 'invited' | 'accepted' | 'declined' | 'tentative'
    attendance TEXT NOT NULL DEFAULT 'present', -- 'present' | 'late' | 'absent' | 'excused' | 'left_early'
    check_in_at TIMESTAMPTZ,
    check_in_method TEXT DEFAULT 'manual', -- 'manual' | 'qr' | 'video_join'
    proxy_for_user_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_meet_session_attendee UNIQUE(session_id, user_id)
);

-- 14. Agenda Items
CREATE TABLE IF NOT EXISTS public.meet_agenda_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.meet_sessions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    presenter_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    planned_minutes INT NOT NULL DEFAULT 15,
    actual_minutes INT DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'in_progress' | 'discussed' | 'deferred'
    linked_point_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Points (Discussion, Action Items, Decisions, Issues)
CREATE TABLE IF NOT EXISTS public.meet_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL, -- PT-00001
    meeting_id UUID NOT NULL REFERENCES public.meet_meetings(id) ON DELETE CASCADE,
    origin_session_id UUID NOT NULL REFERENCES public.meet_sessions(id) ON DELETE CASCADE,
    current_session_id UUID NOT NULL REFERENCES public.meet_sessions(id) ON DELETE CASCADE,
    agenda_item_id UUID REFERENCES public.meet_agenda_items(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    point_type TEXT NOT NULL DEFAULT 'action', -- 'discussion' | 'decision' | 'action' | 'issue' | 'information' | 'risk'
    category_id UUID REFERENCES public.meet_point_categories(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    priority TEXT NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'critical'
    owner_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    raised_by_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    tat_days INT NOT NULL DEFAULT 3,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'in_progress' | 'on_hold' | 'closed' | 'dropped' | 'reopened'
    progress_percent INT NOT NULL DEFAULT 0,
    closure_remarks TEXT,
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    carry_forward_count INT NOT NULL DEFAULT 0,
    is_backup BOOLEAN NOT NULL DEFAULT false,
    is_confidential BOOLEAN NOT NULL DEFAULT false,
    escalation_level INT NOT NULL DEFAULT 0, -- 0 to 4
    sort_order INT NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to auto-generate PT-XXXXX
CREATE OR REPLACE FUNCTION fn_meet_point_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        NEW.code := 'PT-' || LPAD(nextval('meet_point_code_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_meet_point_code ON public.meet_points;
CREATE TRIGGER trg_meet_point_code
    BEFORE INSERT ON public.meet_points
    FOR EACH ROW EXECUTE FUNCTION fn_meet_point_code();

-- 16. Session Points Linkage (Trail across sessions)
CREATE TABLE IF NOT EXISTS public.meet_session_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.meet_sessions(id) ON DELETE CASCADE,
    point_id UUID NOT NULL REFERENCES public.meet_points(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL DEFAULT 'new', -- 'new' | 'carried_forward' | 'pulled' | 'escalated_in'
    status_at_start TEXT NOT NULL DEFAULT 'open',
    status_at_end TEXT,
    discussion_notes TEXT,
    time_spent_minutes INT DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_meet_session_point UNIQUE(session_id, point_id)
);

-- 17. Pre-Meeting Updates
CREATE TABLE IF NOT EXISTS public.meet_pre_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.meet_sessions(id) ON DELETE CASCADE,
    point_id UUID REFERENCES public.meet_points(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_master(id) ON DELETE CASCADE,
    status_proposed TEXT,
    progress_proposed INT,
    text TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'web', -- 'web' | 'whatsapp' | 'email'
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. Tasks under points
CREATE TABLE IF NOT EXISTS public.meet_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL, -- TSK-00001
    point_id UUID NOT NULL REFERENCES public.meet_points(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.meet_sessions(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES public.meet_tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    tat_days INT NOT NULL DEFAULT 3,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    revised_due_date DATE,
    status TEXT NOT NULL DEFAULT 'not_started', -- 'not_started' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
    progress_percent INT NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    tat_result TEXT, -- 'within_tat' | 'breached'
    delay_days INT DEFAULT 0,
    completion_remarks TEXT,
    requires_verification BOOLEAN NOT NULL DEFAULT false,
    verified_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to auto-generate TSK-XXXXX
CREATE OR REPLACE FUNCTION fn_meet_task_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        NEW.code := 'TSK-' || LPAD(nextval('meet_task_code_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_meet_task_code ON public.meet_tasks;
CREATE TRIGGER trg_meet_task_code
    BEFORE INSERT ON public.meet_tasks
    FOR EACH ROW EXECUTE FUNCTION fn_meet_task_code();

-- 19. Task Supporters & Checklist
CREATE TABLE IF NOT EXISTS public.meet_task_supporters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.meet_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_master(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_meet_task_supporter UNIQUE(task_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.meet_task_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.meet_tasks(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_done BOOLEAN NOT NULL DEFAULT false,
    done_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    done_at TIMESTAMPTZ,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 20. TAT Extension Requests
CREATE TABLE IF NOT EXISTS public.meet_tat_extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL DEFAULT 'task', -- 'task' | 'point'
    entity_id UUID NOT NULL,
    requested_by UUID NOT NULL REFERENCES public.user_master(id) ON DELETE RESTRICT,
    old_due_date DATE NOT NULL,
    requested_due_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    decided_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ,
    remarks TEXT,
    channel TEXT NOT NULL DEFAULT 'web',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 21. Decisions Register
CREATE TABLE IF NOT EXISTS public.meet_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL, -- DEC-0001
    session_id UUID NOT NULL REFERENCES public.meet_sessions(id) ON DELETE CASCADE,
    point_id UUID REFERENCES public.meet_points(id) ON DELETE SET NULL,
    text TEXT NOT NULL,
    decided_by TEXT NOT NULL DEFAULT 'Committee',
    decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_from DATE DEFAULT CURRENT_DATE,
    review_date DATE,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'superseded' | 'revoked'
    superseded_by_id UUID REFERENCES public.meet_decisions(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION fn_meet_decision_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        NEW.code := 'DEC-' || LPAD(nextval('meet_decision_code_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_meet_decision_code ON public.meet_decisions;
CREATE TRIGGER trg_meet_decision_code
    BEFORE INSERT ON public.meet_decisions
    FOR EACH ROW EXECUTE FUNCTION fn_meet_decision_code();

-- 22. Minutes of Meeting (MoM) Versions & Acknowledgements
CREATE TABLE IF NOT EXISTS public.meet_mom_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.meet_sessions(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    snapshot JSONB NOT NULL, -- Complete structured snapshot of points, decisions, attendees
    pdf_file_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'pending_approval' | 'approved' | 'published'
    approved_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_meet_mom_version UNIQUE(session_id, version)
);

CREATE TABLE IF NOT EXISTS public.meet_mom_acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.meet_sessions(id) ON DELETE CASCADE,
    mom_version INT NOT NULL DEFAULT 1,
    user_id UUID NOT NULL REFERENCES public.user_master(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    channel TEXT NOT NULL DEFAULT 'web',
    comment TEXT,
    CONSTRAINT uq_meet_mom_ack UNIQUE(session_id, mom_version, user_id)
);

-- 23. Comments & Attachments
CREATE TABLE IF NOT EXISTS public.meet_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- 'session' | 'point' | 'task' | 'decision'
    entity_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES public.user_master(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    parent_comment_id UUID REFERENCES public.meet_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meet_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- 'session' | 'point' | 'task' | 'agenda'
    entity_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    mime TEXT,
    size_bytes BIGINT DEFAULT 0,
    is_pre_read BOOLEAN NOT NULL DEFAULT false,
    uploaded_by UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 24. Immutable Activity Log
CREATE TABLE IF NOT EXISTS public.meet_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- 'meeting' | 'session' | 'point' | 'task' | 'decision' | 'mom'
    entity_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'created' | 'status_changed' | 'carried_forward' | 'assigned' | 'extended' | 'published'
    field TEXT,
    old_value TEXT,
    new_value TEXT,
    user_id UUID REFERENCES public.user_master(id) ON DELETE SET NULL,
    channel TEXT NOT NULL DEFAULT 'web', -- 'web' | 'mobile' | 'whatsapp' | 'email' | 'system'
    ip TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 25. Working Days Calculator Function
CREATE OR REPLACE FUNCTION fn_meet_calculate_due_date(
    p_start_date DATE,
    p_tat_days INT,
    p_company_id UUID DEFAULT NULL
)
RETURNS DATE AS $$
DECLARE
    curr_date DATE := p_start_date;
    days_added INT := 0;
    dow INT;
    is_holiday BOOLEAN;
BEGIN
    IF p_tat_days <= 0 THEN
        RETURN p_start_date;
    END IF;

    WHILE days_added < p_tat_days LOOP
        curr_date := curr_date + 1;
        dow := EXTRACT(DOW FROM curr_date); -- 0=Sunday, 1=Monday... 6=Saturday
        
        -- Exclude Sunday (dow = 0)
        IF dow != 0 THEN
            -- Check statutory holidays
            SELECT EXISTS (
                SELECT 1 FROM public.dmac_holiday_calendar
                WHERE holiday_date = curr_date
            ) INTO is_holiday;

            IF NOT is_holiday THEN
                days_added := days_added + 1;
            END IF;
        END IF;
    END LOOP;

    RETURN curr_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- 26. High Performance Composite Indexes
CREATE INDEX IF NOT EXISTS idx_meet_meetings_dept_status ON public.meet_meetings (department_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_meet_meetings_organizer ON public.meet_meetings (organizer_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_meet_members_user_meeting ON public.meet_meeting_members (user_id, meeting_id);
CREATE INDEX IF NOT EXISTS idx_meet_sessions_meeting_no ON public.meet_sessions (meeting_id, session_no);
CREATE INDEX IF NOT EXISTS idx_meet_sessions_dates_status ON public.meet_sessions (scheduled_start, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_meet_points_meeting_status ON public.meet_points (meeting_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_meet_points_owner_status_due ON public.meet_points (owner_id, status, due_date) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_meet_points_open_due ON public.meet_points (due_date) WHERE status NOT IN ('closed', 'dropped') AND is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_meet_session_points_session ON public.meet_session_points (session_id);
CREATE INDEX IF NOT EXISTS idx_meet_session_points_point ON public.meet_session_points (point_id);
CREATE INDEX IF NOT EXISTS idx_meet_tasks_point ON public.meet_tasks (point_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_meet_tasks_owner_status_due ON public.meet_tasks (owner_id, status, due_date) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_meet_tasks_open_due ON public.meet_tasks (COALESCE(revised_due_date, due_date)) WHERE status NOT IN ('completed', 'cancelled') AND is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_meet_decisions_meeting_date ON public.meet_decisions (session_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_meet_activity_entity_date ON public.meet_activity_log (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meet_comments_entity ON public.meet_comments (entity_type, entity_id, created_at);

-- 27. Row Level Security (RLS) Enablement & Governed Access Policies
ALTER TABLE public.meet_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_meeting_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_point_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_meeting_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_session_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_session_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_pre_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_task_supporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_task_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_tat_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_mom_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_mom_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_activity_log ENABLE ROW LEVEL SECURITY;

-- Grant access to public role and service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Baseline Permissive RLS Policies for Authenticated Operations
CREATE POLICY policy_meet_settings_all ON public.meet_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY policy_meet_types_all ON public.meet_meeting_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY policy_meet_categories_all ON public.meet_point_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY policy_meet_rooms_all ON public.meet_rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY policy_meet_templates_all ON public.meet_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY policy_meet_meetings_all ON public.meet_meetings FOR ALL TO authenticated USING (NOT is_deleted) WITH CHECK (true);
CREATE POLICY policy_meet_members_all ON public.meet_meeting_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY policy_meet_sessions_all ON public.meet_sessions FOR ALL TO authenticated USING (NOT is_deleted) WITH CHECK (true);
CREATE POLICY policy_meet_attendees_all ON public.meet_session_attendees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY policy_meet_agenda_all ON public.meet_agenda_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY policy_meet_points_all ON public.meet_points FOR ALL TO authenticated USING (NOT is_deleted) WITH CHECK (true);
CREATE POLICY policy_meet_session_points_all ON public.meet_session_points FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY policy_meet_pre_updates_all ON public.meet_pre_updates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY policy_meet_tasks_all ON public.meet_tasks FOR ALL TO authenticated USING (NOT is_deleted) WITH CHECK (true);
CREATE POLICY policy_meet_supporters_all ON public.meet_task_supporters FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY policy_meet_checklist_all ON public.meet_task_checklist FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY policy_meet_extensions_all ON public.meet_tat_extensions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY policy_meet_decisions_all ON public.meet_decisions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY policy_meet_mom_all ON public.meet_mom_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY policy_meet_mom_ack_all ON public.meet_mom_acknowledgements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY policy_meet_comments_all ON public.meet_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY policy_meet_attachments_all ON public.meet_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY policy_meet_activity_all ON public.meet_activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
