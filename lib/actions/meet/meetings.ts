"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";
import { revalidatePath } from "next/cache";
import type { MeetingSeries, MeetingMember } from "@/types/meet";

export interface CreateMeetingInput {
  title: string;
  description?: string;
  company_id?: string;
  department_id?: string;
  meeting_type_id: string;
  template_id?: string;
  organizer_id: string;
  chair_id?: string;
  default_minute_taker_id?: string;
  mode: 'in_person' | 'online' | 'hybrid';
  room_id?: string;
  venue_text?: string;
  video_provider: 'none' | 'google_meet' | 'teams' | 'zoom' | 'builtin';
  video_link?: string;
  start_date: string; // YYYY-MM-DD
  default_start_time: string; // HH:mm:ss
  default_duration_minutes: number;
  recurrence: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  allow_attendees_add_points: boolean;
  is_confidential: boolean;
  requires_mom_approval: boolean;
  pre_update_enabled: boolean;
  members: {
    user_id?: string;
    role: string;
    guest_name?: string;
    guest_email?: string;
  }[];
}

export async function getMeetings(filters?: {
  search?: string;
  typeId?: string;
  departmentId?: string;
  status?: string;
}): Promise<MeetingSeries[]> {
  try {
    let query = supabaseAdmin
      .from("meet_meetings")
      .select(`
        *,
        organizer:user_master!meet_meetings_organizer_id_fkey(id, full_name, email),
        meeting_type:meet_meeting_types(id, name, color, is_board_mode),
        room:meet_rooms(id, name, location),
        department:departments(id, name),
        members:meet_meeting_members(
          id, role, guest_name, guest_email,
          user:user_master(id, full_name, email, profile_photo)
        )
      `)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (filters?.typeId) {
      query = query.eq("meeting_type_id", filters.typeId);
    }
    if (filters?.departmentId) {
      query = query.eq("department_id", filters.departmentId);
    }
    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters?.search) {
      query = query.ilike("title", `%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching meetings:", error);
      return [];
    }

    // Enhance with session counts and open points count
    const meetingIds = (data || []).map((m) => m.id);
    if (meetingIds.length === 0) return [];

    const [sessionsRes, pointsRes] = await Promise.all([
      supabaseAdmin
        .from("meet_sessions")
        .select("meeting_id, id")
        .in("meeting_id", meetingIds)
        .eq("is_deleted", false),
      supabaseAdmin
        .from("meet_points")
        .select("meeting_id, id, status")
        .in("meeting_id", meetingIds)
        .not("status", "in", '("closed","dropped")')
        .eq("is_deleted", false),
    ]);

    const sessionCountMap: Record<string, number> = {};
    for (const s of sessionsRes.data || []) {
      sessionCountMap[s.meeting_id] = (sessionCountMap[s.meeting_id] || 0) + 1;
    }

    const pointCountMap: Record<string, number> = {};
    for (const p of pointsRes.data || []) {
      pointCountMap[p.meeting_id] = (pointCountMap[p.meeting_id] || 0) + 1;
    }

    return (data || []).map((m) => ({
      ...m,
      sessions_count: sessionCountMap[m.id] || 0,
      open_points_count: pointCountMap[m.id] || 0,
    })) as MeetingSeries[];
  } catch (err: any) {
    console.error("Unexpected error in getMeetings:", err);
    return [];
  }
}

export async function getMeetingById(id: string): Promise<MeetingSeries | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("meet_meetings")
      .select(`
        *,
        organizer:user_master!meet_meetings_organizer_id_fkey(id, full_name, email),
        meeting_type:meet_meeting_types(id, name, color, is_board_mode),
        room:meet_rooms(id, name, location),
        department:departments(id, name),
        members:meet_meeting_members(
          id, role, guest_name, guest_email,
          user:user_master(id, full_name, email, profile_photo)
        )
      `)
      .eq("id", id)
      .eq("is_deleted", false)
      .maybeSingle();

    if (error || !data) {
      console.error("Error fetching meeting by id:", error);
      return null;
    }

    return data as MeetingSeries;
  } catch (err: any) {
    console.error("Unexpected error in getMeetingById:", err);
    return null;
  }
}

export async function createMeeting(input: CreateMeetingInput) {
  try {
    const { user } = await getCachedUser();
    const userId = user?.id || null;

    // 1. Insert Meeting Series
    const { data: meeting, error: meetingError } = await supabaseAdmin
      .from("meet_meetings")
      .insert({
        title: input.title,
        description: input.description,
        company_id: input.company_id || null,
        department_id: input.department_id || null,
        meeting_type_id: input.meeting_type_id,
        template_id: input.template_id || null,
        organizer_id: input.organizer_id,
        chair_id: input.chair_id || null,
        default_minute_taker_id: input.default_minute_taker_id || null,
        mode: input.mode,
        room_id: input.room_id || null,
        venue_text: input.venue_text || null,
        video_provider: input.video_provider,
        video_link: input.video_link || null,
        default_start_time: input.default_start_time || "10:00:00",
        default_duration_minutes: input.default_duration_minutes || 60,
        recurrence: input.recurrence,
        allow_attendees_add_points: input.allow_attendees_add_points ?? true,
        is_confidential: input.is_confidential ?? false,
        requires_mom_approval: input.requires_mom_approval ?? false,
        pre_update_enabled: input.pre_update_enabled ?? true,
        status: "active",
        created_by: userId,
      })
      .select()
      .single();

    if (meetingError || !meeting) {
      console.error("Error creating meeting:", meetingError);
      return { success: false, error: meetingError?.message || "Failed to create meeting series" };
    }

    // 2. Insert Members (Ensure Organizer is in members roster)
    const membersToInsert = [...input.members];
    if (!membersToInsert.some((m) => m.user_id === input.organizer_id)) {
      membersToInsert.push({ user_id: input.organizer_id, role: "organizer" });
    }
    if (input.chair_id && !membersToInsert.some((m) => m.user_id === input.chair_id)) {
      membersToInsert.push({ user_id: input.chair_id, role: "chair" });
    }
    if (input.default_minute_taker_id && !membersToInsert.some((m) => m.user_id === input.default_minute_taker_id)) {
      membersToInsert.push({ user_id: input.default_minute_taker_id, role: "minute_taker" });
    }

    if (membersToInsert.length > 0) {
      await supabaseAdmin.from("meet_meeting_members").insert(
        membersToInsert.map((m) => ({
          meeting_id: meeting.id,
          user_id: m.user_id || null,
          role: m.role || "required",
          guest_name: m.guest_name || null,
          guest_email: m.guest_email || null,
        }))
      );
    }

    // 3. Create Session 1 (S-001) automatically
    const startDate = input.start_date || new Date().toISOString().split("T")[0];
    const scheduledStart = new Date(`${startDate}T${input.default_start_time || "10:00:00"}+05:30`).toISOString();
    const durationMs = (input.default_duration_minutes || 60) * 60 * 1000;
    const scheduledEnd = new Date(new Date(scheduledStart).getTime() + durationMs).toISOString();

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("meet_sessions")
      .insert({
        meeting_id: meeting.id,
        session_no: 1,
        code: `${meeting.code}/S-001`,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        room_id: input.room_id || null,
        video_link: input.video_link || null,
        minute_taker_id: input.default_minute_taker_id || null,
        status: "scheduled",
        created_by: userId,
      })
      .select()
      .single();

    if (session) {
      // 4. Populate Attendees for Session 1
      if (membersToInsert.length > 0) {
        await supabaseAdmin.from("meet_session_attendees").insert(
          membersToInsert.map((m) => ({
            session_id: session.id,
            user_id: m.user_id || null,
            guest_name: m.guest_name || null,
            guest_email: m.guest_email || null,
            role: m.role || "required",
            invite_status: "invited",
            attendance: "present",
          }))
        );
      }

      // 5. If Template was selected, copy agenda items
      if (input.template_id) {
        const { data: template } = await supabaseAdmin
          .from("meet_templates")
          .select("agenda_items")
          .eq("id", input.template_id)
          .maybeSingle();

        if (template?.agenda_items && Array.isArray(template.agenda_items)) {
          const agendaRows = template.agenda_items.map((item: any, idx: number) => ({
            session_id: session.id,
            title: item.title,
            description: item.description || null,
            planned_minutes: item.planned_minutes || 15,
            sort_order: idx + 1,
            status: "pending",
          }));
          if (agendaRows.length > 0) {
            await supabaseAdmin.from("meet_agenda_items").insert(agendaRows);
          }
        }
      } else {
        // Default standard review agenda items
        await supabaseAdmin.from("meet_agenda_items").insert([
          { session_id: session.id, title: "Review of Action Items & Backup Points", planned_minutes: 15, sort_order: 1 },
          { session_id: session.id, title: "Current Updates & Critical Deliberations", planned_minutes: 30, sort_order: 2 },
          { session_id: session.id, title: "Decisions & Action Items Confirmation", planned_minutes: 15, sort_order: 3 }
        ]);
      }
    }

    // 6. Audit Log
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "meeting",
      entity_id: meeting.id,
      action: "created",
      field: "status",
      old_value: null,
      new_value: "active",
      user_id: userId,
      channel: "web",
    });

    revalidatePath("/meet");
    revalidatePath("/meet/meetings");
    return { success: true, meetingId: meeting.id, sessionId: session?.id };
  } catch (err: any) {
    console.error("Unexpected error in createMeeting:", err);
    return { success: false, error: err.message || "Failed to create meeting" };
  }
}

export async function archiveMeeting(meetingId: string) {
  try {
    const { user } = await getCachedUser();
    const { error } = await supabaseAdmin
      .from("meet_meetings")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", meetingId);

    if (error) return { success: false, error: error.message };

    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "meeting",
      entity_id: meetingId,
      action: "status_changed",
      field: "status",
      old_value: "active",
      new_value: "archived",
      user_id: user?.id || null,
      channel: "web",
    });

    revalidatePath("/meet");
    revalidatePath("/meet/meetings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
