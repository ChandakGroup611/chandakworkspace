"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";
import { revalidatePath } from "next/cache";
import { requireMeet } from "@/lib/permissions/meet";
import { generateICS } from "@/lib/utils/ics";
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
    const { userId, isSuperAdmin, isMeetAdmin } = await requireMeet("MEET_VIEW");

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

    const { data: rawData, error } = await query;
    if (error) {
      console.error("Error fetching meetings:", error);
      return [];
    }

    // Scoping check (Spec A14.5, S3): filter out confidential meetings if user is not a participant
    let data = rawData || [];
    if (!isSuperAdmin && !isMeetAdmin) {
      data = data.filter((m: any) => {
        if (!m.is_confidential) return true;
        if (m.organizer_id === userId || m.chair_id === userId || m.default_minute_taker_id === userId) return true;
        return m.members?.some((mem: any) => mem.user_id === userId);
      });
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
    await requireMeet("MEET_VIEW", { meetingId: id });

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
    const { userId } = await requireMeet("MEET_CREATE");

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

    // 2. Insert Members (Ensure Organizer, Chair and Minute Taker roles are explicitly mapped without dropping organizer)
    const membersMap = new Map<string, { user_id?: string; role: string; guest_name?: string; guest_email?: string }>();
    for (const m of input.members) {
      if (m.user_id) {
        membersMap.set(m.user_id, { ...m, role: m.role || "required" });
      }
    }
    if (input.organizer_id) {
      membersMap.set(input.organizer_id, { user_id: input.organizer_id, role: "organizer" });
    }
    if (input.chair_id && !membersMap.has(input.chair_id)) {
      membersMap.set(input.chair_id, { user_id: input.chair_id, role: "chair" });
    }
    if (input.default_minute_taker_id && !membersMap.has(input.default_minute_taker_id)) {
      membersMap.set(input.default_minute_taker_id, { user_id: input.default_minute_taker_id, role: "minute_taker" });
    }

    // Include guest members (without user_id)
    const guestMembers = input.members.filter((m) => !m.user_id);
    const membersToInsert = [...Array.from(membersMap.values()), ...guestMembers];

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

    const { data: session } = await supabaseAdmin
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
      // 4. Populate Attendees for Session 1 (Default to absent until verified)
      if (membersToInsert.length > 0) {
        await supabaseAdmin.from("meet_session_attendees").insert(
          membersToInsert.map((m) => ({
            session_id: session.id,
            user_id: m.user_id || null,
            guest_name: m.guest_name || null,
            guest_email: m.guest_email || null,
            role: m.role || "required",
            invite_status: "invited",
            attendance: "absent",
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

      // 6. Generate RFC 5545 .ics Calendar Invite & Queue Notification Emails (A7 / E8)
      try {
        const icsString = generateICS({
          uid: `${session.id}@chandakgroup.tech`,
          title: meeting.title,
          description: meeting.description || `Meeting Session 1: ${meeting.title}`,
          location: input.venue_text || "Chandak Corporate Office",
          start: scheduledStart,
          end: scheduledEnd,
          url: input.video_link || undefined,
        });

        const userIds = membersToInsert.filter((m) => m.user_id).map((m) => m.user_id as string);
        if (userIds.length > 0) {
          const { data: profiles } = await supabaseAdmin
            .from("user_master")
            .select("id, full_name, email")
            .in("id", userIds);

          const emailRows = (profiles || [])
            .filter((p) => p.email)
            .map((p) => ({
              recipient_email: p.email,
              subject: `Invitation: ${meeting.title} - Session 1`,
              body: `<p>Dear ${p.full_name},</p><p>You are invited to attend <strong>${meeting.title}</strong>.</p><p><strong>Date & Time:</strong> ${input.start_date} from ${input.default_start_time}</p><p>Please find the calendar invite attached.</p>`,
              event_type: "meet.session.invited",
              status: "pending",
              metadata: {
                meeting_id: meeting.id,
                session_id: session.id,
                ics_data: icsString,
              },
            }));

          if (emailRows.length > 0) {
            await supabaseAdmin.from("email_queue").insert(emailRows);
          }
        }
      } catch (calErr) {
        console.warn("Failed to generate .ics or queue email invite:", calErr);
      }
    }

    // 7. Audit Log
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
    const { userId } = await requireMeet("MEET_DELETE", { meetingId, requireOrganizerOrChair: true });

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
      user_id: userId,
      channel: "web",
    });

    revalidatePath("/meet");
    revalidatePath("/meet/meetings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update an existing meeting series (M1/M8)
 */
export async function updateMeeting(input: {
  meetingId: string;
  title?: string;
  description?: string;
  recurrence?: string;
  organizerId?: string;
  roomId?: string;
  defaultDurationMinutes?: number;
  mode?: string;
  videoLink?: string;
}) {
  try {
    const { userId } = await requireMeet("MEET_UPDATE", { meetingId: input.meetingId, requireOrganizerOrChair: true });

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.description !== undefined) updatePayload.description = input.description;
    if (input.recurrence !== undefined) updatePayload.recurrence = input.recurrence;
    if (input.organizerId !== undefined) updatePayload.organizer_id = input.organizerId;
    if (input.roomId !== undefined) updatePayload.room_id = input.roomId || null;
    if (input.defaultDurationMinutes !== undefined) updatePayload.default_duration_minutes = input.defaultDurationMinutes;
    if (input.mode !== undefined) updatePayload.mode = input.mode;
    if (input.videoLink !== undefined) updatePayload.video_link = input.videoLink || null;

    const { data, error } = await supabaseAdmin
      .from("meet_meetings")
      .update(updatePayload)
      .eq("id", input.meetingId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "meeting",
      entity_id: input.meetingId,
      action: "updated",
      field: "details",
      user_id: userId,
      channel: "web",
    });

    revalidatePath(`/meet/meetings/${input.meetingId}`);
    revalidatePath("/meet/meetings");
    return { success: true, meeting: data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Add a standing member to a meeting series roster
 */
export async function addMeetingMember(input: {
  meetingId: string;
  userId?: string;
  role: string;
  guestName?: string;
  guestEmail?: string;
}) {
  try {
    await requireMeet("MEET_UPDATE", { meetingId: input.meetingId, requireOrganizerOrChair: true });

    const { data: member, error } = await supabaseAdmin
      .from("meet_meeting_members")
      .insert({
        meeting_id: input.meetingId,
        user_id: input.userId || null,
        role: input.role || "attendee",
        guest_name: input.guestName || null,
        guest_email: input.guestEmail || null,
      })
      .select(`
        *,
        user:user_master(id, full_name, email, profile_photo)
      `)
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath(`/meet/meetings/${input.meetingId}`);
    return { success: true, member };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Remove a standing member from a meeting series roster
 */
export async function removeMeetingMember(memberId: string, meetingId: string) {
  try {
    await requireMeet("MEET_UPDATE", { meetingId, requireOrganizerOrChair: true });

    const { error } = await supabaseAdmin
      .from("meet_meeting_members")
      .delete()
      .eq("id", memberId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/meet/meetings/${meetingId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get all points across all sessions of a meeting series (Spec P10)
 */
export async function getMeetingAllPoints(meetingId: string) {
  try {
    await requireMeet("MEET_VIEW", { meetingId });

    const { data, error } = await supabaseAdmin
      .from("meet_points")
      .select(`
        *,
        owner:user_master!meet_points_owner_id_fkey(id, full_name, email, profile_photo),
        category:meet_point_categories(id, name, default_tat_days),
        origin_session:meet_sessions!meet_points_origin_session_id_fkey(id, code, session_no),
        current_session:meet_sessions!meet_points_current_session_id_fkey(id, code, session_no)
      `)
      .eq("meeting_id", meetingId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all points for meeting:", error);
      return [];
    }

    return data || [];
  } catch (err: any) {
    console.error("Unexpected error in getMeetingAllPoints:", err);
    return [];
  }
}
