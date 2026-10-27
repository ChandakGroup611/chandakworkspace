-- Migration: 20261027180000_meet_production_hardening.sql
-- Production Gap Fixes: S4 (RLS Lockdown & Activity Log Immutability), R-2 (Unique Constraint on Session Booking),
-- B5.2 (Holiday Table Safeguard & TAT Calculation), Standalone Tasks & Atomic End-Session Carry-Forward Procedure.

-- ============================================================================
-- 1. SCHEMA HARDENING & CONSTRAINTS (R-2 & Standalone Tasks)
-- ============================================================================

-- Allow standalone tasks (e.g. from My Work / Quick Add without mandatory point linkage)
ALTER TABLE public.meet_tasks ALTER COLUMN point_id DROP NOT NULL;

-- Virtual generated date column for fast date-only lookups & backward compatibility
ALTER TABLE public.meet_sessions 
ADD COLUMN IF NOT EXISTS scheduled_date DATE GENERATED ALWAYS AS ((scheduled_start AT TIME ZONE 'Asia/Kolkata')::date) STORED;

-- Clean up any duplicate room bookings for the same session before applying unique constraint
DELETE FROM public.meet_room_bookings a
USING public.meet_room_bookings b
WHERE a.id < b.id 
  AND a.session_id IS NOT NULL 
  AND a.session_id = b.session_id;

-- Add UNIQUE constraint on session_id for meet_room_bookings to guarantee valid upserts (R-2)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_meet_room_bookings_session'
    ) THEN
        ALTER TABLE public.meet_room_bookings
        ADD CONSTRAINT uq_meet_room_bookings_session UNIQUE (session_id);
    END IF;
END $$;

-- Synchronize sequences above existing records
SELECT setval('meet_meeting_code_seq', GREATEST(COALESCE((SELECT MAX(NULLIF(regexp_replace(code, '\D', '', 'g'), '')::bigint) FROM public.meet_meetings), 0), 1));
SELECT setval('meet_point_code_seq', GREATEST(COALESCE((SELECT MAX(NULLIF(regexp_replace(code, '\D', '', 'g'), '')::bigint) FROM public.meet_points), 0), 1));
SELECT setval('meet_task_code_seq', GREATEST(COALESCE((SELECT MAX(NULLIF(regexp_replace(code, '\D', '', 'g'), '')::bigint) FROM public.meet_tasks), 0), 1));
SELECT setval('meet_decision_code_seq', GREATEST(COALESCE((SELECT MAX(NULLIF(regexp_replace(code, '\D', '', 'g'), '')::bigint) FROM public.meet_decisions), 0), 1));

-- ============================================================================
-- 2. STATUTORY HOLIDAY CALENDAR SAFEGUARD & DUE DATE ENGINE (B5.2)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dmac_holiday_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID,
    company_id UUID,
    holiday_date DATE NOT NULL,
    holiday_name VARCHAR(100) NOT NULL,
    is_statutory BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dmac_holiday_date ON public.dmac_holiday_calendar (holiday_date);

-- Insert essential statutory holidays if empty
INSERT INTO public.dmac_holiday_calendar (holiday_date, holiday_name)
SELECT h.holiday_date, h.holiday_name
FROM (VALUES
    ('2026-01-26'::date, 'Republic Day'),
    ('2026-03-03'::date, 'Holi'),
    ('2026-03-19'::date, 'Gudi Padwa'),
    ('2026-05-01'::date, 'Maharashtra Day'),
    ('2026-08-15'::date, 'Independence Day'),
    ('2026-09-14'::date, 'Ganesh Chaturthi'),
    ('2026-10-02'::date, 'Gandhi Jayanti'),
    ('2026-10-20'::date, 'Dussehra'),
    ('2026-11-09'::date, 'Diwali Laxmi Pujan'),
    ('2026-11-10'::date, 'Diwali Balipratipada'),
    ('2026-12-25'::date, 'Christmas'),
    ('2027-01-26'::date, 'Republic Day'),
    ('2027-03-22'::date, 'Holi')
) AS h(holiday_date, holiday_name)
WHERE NOT EXISTS (
    SELECT 1 FROM public.dmac_holiday_calendar WHERE dmac_holiday_calendar.holiday_date = h.holiday_date
);

-- Bulletproof working-days due date calculator
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
    IF p_tat_days IS NULL OR p_tat_days <= 0 THEN
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
                  AND (p_company_id IS NULL OR company_id IS NULL OR company_id = p_company_id)
            ) INTO is_holiday;

            IF NOT is_holiday THEN
                days_added := days_added + 1;
            END IF;
        END IF;
    END LOOP;

    RETURN curr_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 3. RLS OVERHAUL & ACTIVITY LOG IMMUTABILITY (S4)
-- ============================================================================

-- Drop wide-open baseline policies from both earlier migrations
DO $$
DECLARE
    r RECORD;
    policies_to_drop TEXT[] := ARRAY[
        'policy_meet_settings_all', 'policy_meet_types_all', 'policy_meet_categories_all',
        'policy_meet_rooms_all', 'policy_meet_templates_all', 'policy_meet_meetings_all',
        'policy_meet_members_all', 'policy_meet_sessions_all', 'policy_meet_attendees_all',
        'policy_meet_agenda_all', 'policy_meet_points_all', 'policy_meet_session_points_all',
        'policy_meet_pre_updates_all', 'policy_meet_tasks_all', 'policy_meet_supporters_all',
        'policy_meet_checklist_all', 'policy_meet_extensions_all', 'policy_meet_decisions_all',
        'policy_meet_mom_all', 'policy_meet_mom_ack_all', 'policy_meet_comments_all',
        'policy_meet_attachments_all', 'policy_meet_activity_all',
        'meet_notes_all_auth', 'meet_note_blocks_all_auth', 'meet_note_shares_all_auth',
        'meet_note_versions_all_auth', 'core_module_settings_all_auth',
        'core_notification_templates_all_auth', 'meet_alert_rules_all_auth',
        'meet_sla_policies_all_auth', 'meet_sla_instances_all_auth', 'meet_invitations_all_auth',
        'meet_ai_minutes_all_auth', 'meet_room_bookings_all_auth', 'meet_room_devices_all_auth'
    ];
    p_name TEXT;
BEGIN
    FOREACH p_name IN ARRAY policies_to_drop LOOP
        FOR r IN (
            SELECT schemaname, tablename, policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' AND policyname = p_name
        ) LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        END LOOP;
    END LOOP;
END $$;

-- Helper function to check if current user is Super Admin or Meet Admin
CREATE OR REPLACE FUNCTION public.fn_meet_is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check Super Admin
    IF EXISTS (
        SELECT 1 FROM public.user_master u
        JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = p_user_id 
          AND UPPER(r.code) IN ('SUPER_ADMIN', 'ROLE_ADMIN', 'ADMIN')
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check MEET_ADMIN permission
    IF EXISTS (
        SELECT 1 FROM public.user_permissions_snapshot
        WHERE user_id = p_user_id AND permission_code = 'MEET_ADMIN'
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3A. meet_activity_log: IMMUTABLE AUDIT TRAIL (INSERT-ONLY)
DROP POLICY IF EXISTS policy_meet_activity_select ON public.meet_activity_log;
DROP POLICY IF EXISTS policy_meet_activity_insert ON public.meet_activity_log;
DROP POLICY IF EXISTS policy_meet_activity_update ON public.meet_activity_log;
DROP POLICY IF EXISTS policy_meet_activity_delete ON public.meet_activity_log;

CREATE POLICY policy_meet_activity_select ON public.meet_activity_log
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY policy_meet_activity_insert ON public.meet_activity_log
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid() OR public.fn_meet_is_admin(auth.uid()))
    );

-- Explicitly disallow UPDATE and DELETE on activity log
CREATE POLICY policy_meet_activity_no_update ON public.meet_activity_log
    FOR UPDATE TO authenticated
    USING (false)
    WITH CHECK (false);

CREATE POLICY policy_meet_activity_no_delete ON public.meet_activity_log
    FOR DELETE TO authenticated
    USING (false);

-- 3B. Admin Masters: Read by all authenticated; Mutation restricted to Meet Admin / Super Admin
DO $$
DECLARE
    tbl TEXT;
    admin_tables TEXT[] := ARRAY[
        'meet_settings', 'meet_meeting_types', 'meet_point_categories',
        'meet_rooms', 'meet_templates', 'core_module_settings',
        'core_notification_templates', 'meet_alert_rules', 'meet_sla_policies', 'meet_room_devices'
    ];
BEGIN
    FOREACH tbl IN ARRAY admin_tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I_admin_mutation ON public.%I', tbl, tbl);

        EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated USING (true)', tbl, tbl);
        EXECUTE format('CREATE POLICY %I_admin_mutation ON public.%I FOR ALL TO authenticated USING (public.fn_meet_is_admin(auth.uid())) WITH CHECK (public.fn_meet_is_admin(auth.uid()))', tbl, tbl);
    END LOOP;
END $$;

-- 3C. Core Entities: Scoped to Membership, Department, Ownership or Admin
-- Meetings
DROP POLICY IF EXISTS policy_meet_meetings_select ON public.meet_meetings;
DROP POLICY IF EXISTS policy_meet_meetings_mutation ON public.meet_meetings;

CREATE POLICY policy_meet_meetings_select ON public.meet_meetings
    FOR SELECT TO authenticated
    USING (
        NOT is_deleted AND (
            public.fn_meet_is_admin(auth.uid()) OR
            organizer_id = auth.uid() OR
            chair_id = auth.uid() OR
            default_minute_taker_id = auth.uid() OR
            EXISTS (SELECT 1 FROM public.meet_meeting_members m WHERE m.meeting_id = id AND m.user_id = auth.uid()) OR
            (NOT is_confidential)
        )
    );

CREATE POLICY policy_meet_meetings_mutation ON public.meet_meetings
    FOR ALL TO authenticated
    USING (
        public.fn_meet_is_admin(auth.uid()) OR
        organizer_id = auth.uid() OR
        chair_id = auth.uid()
    )
    WITH CHECK (
        public.fn_meet_is_admin(auth.uid()) OR
        organizer_id = auth.uid() OR
        chair_id = auth.uid()
    );

-- Meeting Members
DROP POLICY IF EXISTS policy_meet_members_all ON public.meet_meeting_members;
CREATE POLICY policy_meet_members_scoped ON public.meet_meeting_members
    FOR ALL TO authenticated
    USING (
        public.fn_meet_is_admin(auth.uid()) OR
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.meet_meetings m 
            WHERE m.id = meeting_id AND (m.organizer_id = auth.uid() OR m.chair_id = auth.uid() OR NOT m.is_confidential)
        )
    )
    WITH CHECK (
        public.fn_meet_is_admin(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.meet_meetings m 
            WHERE m.id = meeting_id AND (m.organizer_id = auth.uid() OR m.chair_id = auth.uid())
        )
    );

-- Sessions
DROP POLICY IF EXISTS policy_meet_sessions_scoped ON public.meet_sessions;
CREATE POLICY policy_meet_sessions_scoped ON public.meet_sessions
    FOR ALL TO authenticated
    USING (
        NOT is_deleted AND (
            public.fn_meet_is_admin(auth.uid()) OR
            created_by = auth.uid() OR
            minute_taker_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.meet_meetings m 
                WHERE m.id = meeting_id AND (
                    m.organizer_id = auth.uid() OR 
                    m.chair_id = auth.uid() OR 
                    NOT m.is_confidential OR
                    EXISTS (SELECT 1 FROM public.meet_meeting_members mm WHERE mm.meeting_id = m.id AND mm.user_id = auth.uid())
                )
            )
        )
    )
    WITH CHECK (
        public.fn_meet_is_admin(auth.uid()) OR
        created_by = auth.uid() OR
        minute_taker_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.meet_meetings m 
            WHERE m.id = meeting_id AND (m.organizer_id = auth.uid() OR m.chair_id = auth.uid())
        )
    );

-- Session Attendees
DROP POLICY IF EXISTS policy_meet_attendees_scoped ON public.meet_session_attendees;
CREATE POLICY policy_meet_attendees_scoped ON public.meet_session_attendees
    FOR ALL TO authenticated
    USING (
        public.fn_meet_is_admin(auth.uid()) OR
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.meet_sessions s
            JOIN public.meet_meetings m ON s.meeting_id = m.id
            WHERE s.id = session_id AND (m.organizer_id = auth.uid() OR m.chair_id = auth.uid() OR NOT m.is_confidential)
        )
    )
    WITH CHECK (
        public.fn_meet_is_admin(auth.uid()) OR
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.meet_sessions s
            JOIN public.meet_meetings m ON s.meeting_id = m.id
            WHERE s.id = session_id AND (m.organizer_id = auth.uid() OR m.chair_id = auth.uid() OR s.minute_taker_id = auth.uid())
        )
    );

-- Points
DROP POLICY IF EXISTS policy_meet_points_scoped ON public.meet_points;
CREATE POLICY policy_meet_points_scoped ON public.meet_points
    FOR ALL TO authenticated
    USING (
        NOT is_deleted AND (
            public.fn_meet_is_admin(auth.uid()) OR
            owner_id = auth.uid() OR
            created_by = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.meet_meetings m 
                WHERE m.id = meeting_id AND (
                    m.organizer_id = auth.uid() OR 
                    m.chair_id = auth.uid() OR 
                    NOT m.is_confidential OR
                    EXISTS (SELECT 1 FROM public.meet_meeting_members mm WHERE mm.meeting_id = m.id AND mm.user_id = auth.uid())
                )
            )
        )
    )
    WITH CHECK (
        public.fn_meet_is_admin(auth.uid()) OR
        owner_id = auth.uid() OR
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.meet_meetings m 
            WHERE m.id = meeting_id AND (m.organizer_id = auth.uid() OR m.chair_id = auth.uid())
        )
    );

-- Tasks
DROP POLICY IF EXISTS policy_meet_tasks_scoped ON public.meet_tasks;
CREATE POLICY policy_meet_tasks_scoped ON public.meet_tasks
    FOR ALL TO authenticated
    USING (
        NOT is_deleted AND (
            public.fn_meet_is_admin(auth.uid()) OR
            owner_id = auth.uid() OR
            created_by = auth.uid() OR
            verified_by = auth.uid() OR
            EXISTS (SELECT 1 FROM public.meet_task_supporters sup WHERE sup.task_id = id AND sup.user_id = auth.uid()) OR
            point_id IS NULL OR
            EXISTS (
                SELECT 1 FROM public.meet_points p
                JOIN public.meet_meetings m ON p.meeting_id = m.id
                WHERE p.id = point_id AND (NOT m.is_confidential OR m.organizer_id = auth.uid() OR m.chair_id = auth.uid())
            )
        )
    )
    WITH CHECK (
        public.fn_meet_is_admin(auth.uid()) OR
        owner_id = auth.uid() OR
        created_by = auth.uid() OR
        point_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.meet_points p
            JOIN public.meet_meetings m ON p.meeting_id = m.id
            WHERE p.id = point_id AND (m.organizer_id = auth.uid() OR m.chair_id = auth.uid() OR p.owner_id = auth.uid())
        )
    );

-- Room Bookings
DROP POLICY IF EXISTS policy_meet_room_bookings_scoped ON public.meet_room_bookings;
CREATE POLICY policy_meet_room_bookings_scoped ON public.meet_room_bookings
    FOR ALL TO authenticated
    USING (
        public.fn_meet_is_admin(auth.uid()) OR
        booked_by = auth.uid() OR
        approved_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.meet_sessions s
            JOIN public.meet_meetings m ON s.meeting_id = m.id
            WHERE s.id = session_id AND (NOT m.is_confidential OR m.organizer_id = auth.uid() OR m.chair_id = auth.uid())
        ) OR
        session_id IS NULL
    )
    WITH CHECK (
        public.fn_meet_is_admin(auth.uid()) OR
        booked_by = auth.uid() OR
        session_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.meet_sessions s
            JOIN public.meet_meetings m ON s.meeting_id = m.id
            WHERE s.id = session_id AND (m.organizer_id = auth.uid() OR m.chair_id = auth.uid())
        )
    );

-- Notes & Blocks
DROP POLICY IF EXISTS policy_meet_notes_scoped ON public.meet_notes;
CREATE POLICY policy_meet_notes_scoped ON public.meet_notes
    FOR ALL TO authenticated
    USING (
        public.fn_meet_is_admin(auth.uid()) OR
        owner_id = auth.uid() OR
        visibility = 'public' OR
        (visibility = 'workspace' AND kind = 'session') OR
        EXISTS (SELECT 1 FROM public.meet_note_shares s WHERE s.note_id = id AND s.user_id = auth.uid())
    )
    WITH CHECK (
        public.fn_meet_is_admin(auth.uid()) OR
        owner_id = auth.uid() OR
        (kind = 'session' AND session_id IS NOT NULL)
    );

DROP POLICY IF EXISTS policy_meet_note_blocks_scoped ON public.meet_note_blocks;
CREATE POLICY policy_meet_note_blocks_scoped ON public.meet_note_blocks
    FOR ALL TO authenticated
    USING (
        deleted_at IS NULL AND (
            public.fn_meet_is_admin(auth.uid()) OR
            author_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.meet_notes n 
                WHERE n.id = note_id AND (
                    n.owner_id = auth.uid() OR 
                    n.visibility = 'public' OR 
                    (n.visibility = 'workspace' AND n.kind = 'session') OR
                    EXISTS (SELECT 1 FROM public.meet_note_shares s WHERE s.note_id = n.id AND s.user_id = auth.uid())
                )
            )
        )
    )
    WITH CHECK (
        public.fn_meet_is_admin(auth.uid()) OR
        author_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.meet_notes n 
            WHERE n.id = note_id AND (n.owner_id = auth.uid() OR n.kind = 'session')
        )
    );

-- ============================================================================
-- 4. ATOMIC SESSION CLOSURE & CARRY-FORWARD TRANSACTION FUNCTION (S7)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_meet_end_session_and_carry_forward(
    p_session_id UUID,
    p_ended_by UUID,
    p_actual_end TIMESTAMPTZ,
    p_summary_notes TEXT,
    p_create_next_session BOOLEAN DEFAULT TRUE
)
RETURNS JSONB AS $$
DECLARE
    v_session RECORD;
    v_meeting RECORD;
    v_next_session_id UUID := NULL;
    v_next_session_no INT;
    v_next_session_code TEXT;
    v_next_start TIMESTAMPTZ;
    v_next_end TIMESTAMPTZ;
    v_open_point RECORD;
    v_carried_count INT := 0;
    v_new_carry_count INT;
BEGIN
    -- 1. Fetch and lock session
    SELECT * INTO v_session FROM public.meet_sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session % not found', p_session_id;
    END IF;

    -- 2. Fetch meeting series
    SELECT * INTO v_meeting FROM public.meet_meetings WHERE id = v_session.meeting_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Meeting series % not found', v_session.meeting_id;
    END IF;

    -- 3. Close the current session
    UPDATE public.meet_sessions
    SET status = 'mom_draft',
        actual_end = COALESCE(p_actual_end, now()),
        summary_notes = COALESCE(p_summary_notes, summary_notes),
        updated_at = now()
    WHERE id = p_session_id;

    -- 4. Calculate next session date if recurrence is configured and requested
    IF p_create_next_session AND v_meeting.recurrence IS NOT NULL AND v_meeting.recurrence != 'none' THEN
        IF v_meeting.recurrence = 'daily' THEN
            v_next_start := v_session.scheduled_start + INTERVAL '1 day';
        ELSIF v_meeting.recurrence = 'weekly' THEN
            v_next_start := v_session.scheduled_start + INTERVAL '7 days';
        ELSIF v_meeting.recurrence = 'biweekly' THEN
            v_next_start := v_session.scheduled_start + INTERVAL '14 days';
        ELSIF v_meeting.recurrence = 'monthly' THEN
            v_next_start := v_session.scheduled_start + INTERVAL '1 month';
        ELSE
            v_next_start := v_session.scheduled_start + INTERVAL '7 days';
        END IF;

        v_next_end := v_next_start + (v_session.scheduled_end - v_session.scheduled_start);
        v_next_session_no := v_session.session_no + 1;
        v_next_session_code := v_meeting.code || '-S' || LPAD(v_next_session_no::TEXT, 2, '0');

        -- Create next session
        INSERT INTO public.meet_sessions (
            meeting_id,
            session_no,
            code,
            scheduled_start,
            scheduled_end,
            room_id,
            video_link,
            minute_taker_id,
            previous_session_id,
            status,
            created_by
        ) VALUES (
            v_meeting.id,
            v_next_session_no,
            v_next_session_code,
            v_next_start,
            v_next_end,
            v_meeting.room_id,
            v_meeting.video_link,
            v_session.minute_taker_id,
            v_session.id,
            'scheduled',
            p_ended_by
        ) RETURNING id INTO v_next_session_id;

        -- Carry forward attendees
        INSERT INTO public.meet_session_attendees (
            session_id,
            user_id,
            guest_name,
            guest_email,
            role,
            invite_status,
            attendance
        )
        SELECT 
            v_next_session_id,
            user_id,
            guest_name,
            guest_email,
            role,
            'invited',
            'absent' -- Default to absent until checked in!
        FROM public.meet_session_attendees
        WHERE session_id = p_session_id;
    END IF;

    -- 5. Atomic Carry-forward of all open points
    FOR v_open_point IN (
        SELECT p.id, p.code, p.title, p.carry_forward_count, sp.discussion_notes
        FROM public.meet_session_points sp
        JOIN public.meet_points p ON sp.point_id = p.id
        WHERE sp.session_id = p_session_id
          AND p.status NOT IN ('closed', 'dropped')
          AND p.is_deleted = false
    ) LOOP
        v_new_carry_count := v_open_point.carry_forward_count + 1;
        v_carried_count := v_carried_count + 1;

        -- Increment carry forward count on the point
        UPDATE public.meet_points
        SET carry_forward_count = v_new_carry_count,
            updated_at = now()
        WHERE id = v_open_point.id;

        -- Link to next session as carried_forward backup point if next session was created
        IF v_next_session_id IS NOT NULL THEN
            INSERT INTO public.meet_session_points (
                session_id,
                point_id,
                entry_type,
                discussion_notes
            ) VALUES (
                v_next_session_id,
                v_open_point.id,
                'carried_forward',
                v_open_point.discussion_notes
            ) ON CONFLICT (session_id, point_id) DO NOTHING;
        END IF;

        -- Immutable audit log for point carry-forward
        INSERT INTO public.meet_activity_log (
            entity_type,
            entity_id,
            action,
            field,
            old_value,
            new_value,
            user_id,
            channel
        ) VALUES (
            'point',
            v_open_point.id,
            'carried_forward',
            'carry_forward_count',
            v_open_point.carry_forward_count::TEXT,
            v_new_carry_count::TEXT,
            p_ended_by,
            'system'
        );
    END LOOP;

    -- 6. Audit log for session completion
    INSERT INTO public.meet_activity_log (
        entity_type,
        entity_id,
        action,
        field,
        old_value,
        new_value,
        user_id,
        channel
    ) VALUES (
        'session',
        p_session_id,
        'status_changed',
        'status',
        v_session.status,
        'mom_draft',
        p_ended_by,
        'web'
    );

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'next_session_id', v_next_session_id,
        'carried_points_count', v_carried_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
