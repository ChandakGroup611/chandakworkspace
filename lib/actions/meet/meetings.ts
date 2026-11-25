"use server";

import { syncSessionEvent } from "@/lib/integrations/outlook-events";
import { sendMeetEmail } from "@/lib/utils/meet-email";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";
import { revalidatePath } from "next/cache";
import { requireMeet } from "@/lib/permissions/meet";
import { readMeetProjects, readMeetingProjectMap, setMeetingProject } from "@/lib/utils/meet-projects";
import { generateICS } from "@/lib/utils/ics";
import { bookRoomForSession } from "@/lib/actions/meet/rooms";
import { notifyMeetInApp } from "@/lib/utils/meet-inapp";
import type { MeetingSeries, MeetingMember } from "@/types/meet";

import { generateTeamsMeetingLink, sanitizeTeamsUrl } from "@/lib/integrations/microsoft-teams";

export interface CreateMeetingInput {
  title: string;
  description?: string;
  project_id?: string;
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
  /** Agenda typed on the Schedule page; used instead of the template / default agenda when given. */
  agenda_items?: { title: string; planned_minutes: number }[];
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
        project:workspaces!meet_meetings_project_id_fkey(id, name:workspace_name, code:workspace_code),
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
        return m.members?.some((mem: any) => mem.user?.id === userId);
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

    const [projList, projMap] = await Promise.all([readMeetProjects(), readMeetingProjectMap(meetingIds)]);
    const projById = new Map(projList.map((p) => [p.id, p]));
    return (data || []).map((m: any) => ({
      ...m,
      // Meet's own project (Settings › Projects), not a Workspace task project
      project: projMap.get(m.id) ? projById.get(projMap.get(m.id)!) || null : null,
      meet_project_id: projMap.get(m.id) || null,
      video_link: sanitizeTeamsUrl(
        m.video_link,
        (m.members || []).map((mb: any) => mb.user?.email || mb.guest_email).filter(Boolean),
        m.title
      ),
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
        project:workspaces!meet_meetings_project_id_fkey(id, name:workspace_name, code:workspace_code),
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

    const attendeeEmails = ((data as any).members || []).map((mb: any) => mb.user?.email || mb.guest_email).filter(Boolean);
    const [projList, projMap] = await Promise.all([readMeetProjects(), readMeetingProjectMap([id])]);
    const pid = projMap.get(id) || null;
    return {
      ...data,
      project: pid ? projList.find((p) => p.id === pid) || null : null,
      meet_project_id: pid,
      video_link: sanitizeTeamsUrl((data as any).video_link, attendeeEmails, (data as any).title),
    } as MeetingSeries;
  } catch (err: any) {
    console.error("Unexpected error in getMeetingById:", err);
    return null;
  }
}

export async function createMeeting(input: CreateMeetingInput) {
  try {
    const { userId } = await requireMeet("MEET_CREATE");

    // Collect attendee emails for Microsoft Teams call/meeting link
    let attendeeEmails: string[] = [];
    if (input.members && input.members.length > 0) {
      const memberUserIds = input.members.map((m) => m.user_id).filter(Boolean) as string[];
      if (memberUserIds.length > 0) {
        const { data: userRecords } = await supabaseAdmin
          .from("user_master")
          .select("id, email")
          .in("id", memberUserIds);
        for (const u of userRecords || []) {
          if (u.email && !attendeeEmails.includes(u.email)) {
            attendeeEmails.push(u.email);
          }
        }
      }
      for (const m of input.members) {
        if (m.guest_email && !attendeeEmails.includes(m.guest_email)) {
          attendeeEmails.push(m.guest_email);
        }
      }
    }

    // Automatically generate Microsoft Teams meeting link if not manually supplied
    let effectiveVideoLink = (input.video_link || "").trim();
    if (!effectiveVideoLink && input.mode !== "in_person") {
      try {
        const { data: orgUser } = await supabaseAdmin
          .from("user_master")
          .select("email")
          .eq("id", input.organizer_id)
          .maybeSingle();

        const startIso = `${input.start_date || new Date().toISOString().split("T")[0]}T${input.default_start_time || "10:00:00"}`;
        const dur = input.default_duration_minutes || 60;
        const endIso = new Date(new Date(startIso).getTime() + dur * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "");

        effectiveVideoLink = await generateTeamsMeetingLink({
          title: input.title,
          description: input.description,
          scheduledStart: startIso,
          scheduledEnd: endIso,
          organizerId: input.organizer_id,
          organizerEmail: orgUser?.email,
          attendeeEmails,
          callType: "meeting",
          meetingCode: "MTG",
        });
      } catch (teamsErr) {
        console.warn("[createMeeting] Auto Teams link generation fallback:", teamsErr);
      }
    }

    // 1. Insert Meeting Series
    const { data: meeting, error: meetingError } = await supabaseAdmin
      .from("meet_meetings")
      .insert({
        title: input.title,
        description: input.description,
        project_id: null, // Meet projects are stored separately (lib/utils/meet-projects.ts)
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
        video_link: effectiveVideoLink || null,
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
    if (input.project_id) await setMeetingProject(meeting.id, input.project_id, userId);

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
        video_link: effectiveVideoLink || null,
        minute_taker_id: input.default_minute_taker_id || null,
        status: "scheduled",
        created_by: userId,
      })
      .select()
      .single();

    if (session) {
      // Hold the room picked on the Schedule page for this first date
      if (input.room_id) {
        await bookRoomForSession(session.id, input.room_id, scheduledStart, scheduledEnd).catch(() => null);
      }

      // 4. Populate Attendees for Session 1 (Default to absent until verified)
      if (membersToInsert.length > 0) {
        await supabaseAdmin.from("meet_session_attendees").insert(
          membersToInsert.map((m) => ({
            session_id: session.id,
            user_id: m.user_id || null,
            guest_name: m.guest_name || null,
            guest_email: m.guest_email || null,
            role: m.role || "required",
            // The organiser set the meeting up, so they're attending
            invite_status: m.user_id && m.user_id === input.organizer_id ? "accepted" : "invited",
            attendance: "absent",
          }))
        );
      }

      // Bell notification for everyone invited (no email unless an admin set up the template)
      await notifyMeetInApp(
        membersToInsert.map((m) => m.user_id),
        `Meeting invite: ${meeting.title}`,
        `${new Date(scheduledStart).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}. You're on the invite list. Please accept, or say you can't attend.`,
        `/meet/join/${session.id}`,
        userId
      ).catch(() => null);

      // 5. Agenda: what was typed on the Schedule page, else the template's, else the standard one
      const typedAgenda = (input.agenda_items || [])
        .map((a) => ({ title: String(a.title || "").trim().slice(0, 300), planned_minutes: Math.min(Math.max(Number(a.planned_minutes) || 10, 1), 600) }))
        .filter((a) => a.title)
        .slice(0, 40);
      if (typedAgenda.length > 0) {
        await supabaseAdmin.from("meet_agenda_items").insert(
          typedAgenda.map((a, idx) => ({
            session_id: session.id,
            title: a.title,
            planned_minutes: a.planned_minutes,
            sort_order: idx + 1,
            status: "pending",
          }))
        );
      } else if (input.template_id) {
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

        void icsString; // not attached: template emails are HTML only
        // Real Teams meeting in the organiser's Outlook (no-op until Microsoft 365 is connected)
        const outlook = await syncSessionEvent(session.id).catch(() => null);

        await sendMeetEmail("Meeting created", {
          entityId: session.id,
          sessionId: session.id,
          actorId: userId,
          recipients: {
            "Everyone invited": membersToInsert.map((m) => m.user_id),
            "Organiser (creator)": [input.organizer_id],
            Chair: [input.chair_id],
            "Minute taker": [input.default_minute_taker_id],
          },
          link: `/meet/join/${session.id}`,
          data: {
            meeting_title: meeting.title,
            meeting_code: meeting.code,
            session_code: session.code,
            start_time: `${new Date(scheduledStart).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`,
            join_link: outlook?.joinUrl || effectiveVideoLink || "",
            link: `${process.env.NEXT_PUBLIC_SITE_URL || "https://chandakgroup.tech"}/meet/join/${session.id}`,
          },
        });
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

/** Bring an archived meeting back to the active list. */
export async function restoreMeeting(meetingId: string) {
  try {
    const { userId } = await requireMeet("MEET_DELETE", { meetingId, requireOrganizerOrChair: true });
    const { error } = await supabaseAdmin.from("meet_meetings").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", meetingId);
    if (error) return { success: false, error: error.message };
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "meeting", entity_id: meetingId, action: "status_changed", field: "status", old_value: "archived", new_value: "active", user_id: userId, channel: "web",
    });
    revalidatePath("/meet/meetings");
    revalidatePath(`/meet/meetings/${meetingId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete a meeting. Only its organiser or a Meet admin can. Upcoming dates are cancelled
 * (rooms freed, Outlook/Teams events cancelled, "Meeting cancelled" email if switched on) and
 * the meeting is hidden everywhere. Nothing is erased: minutes, points, tasks and decisions
 * already recorded stay in the history and the activity log keeps who deleted it and why.
 */
export async function deleteMeeting(input: { meetingId: string; reason: string }) {
  try {
    const auth = await requireMeet("MEET_DELETE", { meetingId: input.meetingId });
    const reason = String(input.reason || "").trim();
    if (reason.length < 3) return { success: false, error: "Please give a reason." };
    const { data: m } = await supabaseAdmin.from("meet_meetings").select("id, organizer_id, title, is_deleted").eq("id", input.meetingId).maybeSingle();
    if (!m || m.is_deleted) return { success: false, error: "Meeting not found." };
    if (!(auth.isSuperAdmin || auth.isMeetAdmin || m.organizer_id === auth.userId)) {
      return { success: false, error: "Only the organiser or a Meet admin can delete this meeting." };
    }
    const { data: running } = await supabaseAdmin.from("meet_sessions").select("id").eq("meeting_id", input.meetingId).eq("status", "in_progress").eq("is_deleted", false).limit(1);
    if (running && running.length) return { success: false, error: "This meeting is running right now. End it first." };

    const { data: upcoming } = await supabaseAdmin.from("meet_sessions").select("id").eq("meeting_id", input.meetingId).eq("status", "scheduled").eq("is_deleted", false);
    const { cancelSession } = await import("@/lib/actions/meet/sessions");
    for (const s of upcoming || []) await cancelSession({ sessionId: s.id, reason: `Meeting deleted: ${reason}` });

    const { error } = await supabaseAdmin.from("meet_meetings").update({ is_deleted: true, status: "archived", updated_at: new Date().toISOString() }).eq("id", input.meetingId);
    if (error) return { success: false, error: error.message };
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "meeting", entity_id: input.meetingId, action: "deleted", field: "is_deleted", old_value: "false", new_value: `true · ${reason.slice(0, 300)}`, user_id: auth.userId, channel: "web",
    });
    revalidatePath("/meet");
    revalidatePath("/meet/meetings");
    return { success: true, cancelled: (upcoming || []).length };
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
  // Full-form edit (same fields as createMeeting), sent by the shared series form in edit mode.
  projectId?: string;
  meetingTypeId?: string;
  departmentId?: string;
  chairId?: string;
  minuteTakerId?: string;
  videoProvider?: string;
  defaultStartTime?: string;
  allowAttendeesAddPoints?: boolean;
  isConfidential?: boolean;
  requiresMomApproval?: boolean;
  preUpdateEnabled?: boolean;
  /**
   * Standing attendees ticked in the form. Only "required"/"attendee" user rows are
   * synced; organizer, chair, minute-taker and guest rows are left alone.
   */
  attendeeUserIds?: string[];
}) {
  try {
    const { userId } = await requireMeet("MEET_UPDATE", { meetingId: input.meetingId, requireOrganizerOrChair: true });

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.projectId !== undefined) {
      updatePayload.project_id = null;
      await setMeetingProject(input.meetingId, input.projectId || null, userId);
    }
    if (input.meetingTypeId !== undefined && input.meetingTypeId) updatePayload.meeting_type_id = input.meetingTypeId;
    if (input.departmentId !== undefined) updatePayload.department_id = input.departmentId || null;
    if (input.chairId !== undefined) updatePayload.chair_id = input.chairId || null;
    if (input.minuteTakerId !== undefined) updatePayload.default_minute_taker_id = input.minuteTakerId || null;
    if (input.videoProvider !== undefined) updatePayload.video_provider = input.videoProvider;
    if (input.defaultStartTime !== undefined && input.defaultStartTime) updatePayload.default_start_time = input.defaultStartTime;
    if (input.allowAttendeesAddPoints !== undefined) updatePayload.allow_attendees_add_points = input.allowAttendeesAddPoints;
    if (input.isConfidential !== undefined) updatePayload.is_confidential = input.isConfidential;
    if (input.requiresMomApproval !== undefined) updatePayload.requires_mom_approval = input.requiresMomApproval;
    if (input.preUpdateEnabled !== undefined) updatePayload.pre_update_enabled = input.preUpdateEnabled;

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

    if (input.attendeeUserIds) {
      const SYNCED_ROLES = ["required", "attendee"];
      const { data: existing } = await supabaseAdmin
        .from("meet_meeting_members")
        .select("id, user_id, role")
        .eq("meeting_id", input.meetingId);
      const rows = existing || [];
      const wanted = new Set(input.attendeeUserIds.filter(Boolean));
      const present = new Set(rows.filter((r: any) => r.user_id).map((r: any) => r.user_id as string));

      const toRemove = rows.filter((r: any) => r.user_id && SYNCED_ROLES.includes(r.role) && !wanted.has(r.user_id)).map((r: any) => r.id);
      const toAdd = Array.from(wanted).filter((uid) => !present.has(uid));

      if (toRemove.length) await supabaseAdmin.from("meet_meeting_members").delete().in("id", toRemove);
      if (toAdd.length) {
        await supabaseAdmin
          .from("meet_meeting_members")
          .insert(toAdd.map((uid) => ({ meeting_id: input.meetingId, user_id: uid, role: "required" })));
      }
    }

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
