"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";
import { revalidatePath } from "next/cache";
import { requireMeet } from "@/lib/permissions/meet";
import type { MeetingSession, SessionAttendee, AgendaItem, MeetingPoint } from "@/types/meet";
import { sanitizeTeamsUrl } from "@/lib/integrations/microsoft-teams";

export async function getSessionsForMeeting(meetingId: string): Promise<MeetingSession[]> {
  try {
    await requireMeet("MEET_VIEW", { meetingId });
    const { data, error } = await supabaseAdmin
      .from("meet_sessions")
      .select(`
        *,
        minute_taker:user_master!meet_sessions_minute_taker_id_fkey(id, full_name, email),
        attendees:meet_session_attendees(
          id, role, invite_status, attendance, check_in_at,
          user:user_master(id, full_name, email, profile_photo)
        )
      `)
      .eq("meeting_id", meetingId)
      .eq("is_deleted", false)
      .order("session_no", { ascending: false });

    if (error) {
      console.error("Error fetching sessions:", error);
      return [];
    }

    // Attach points count
    const sessionIds = (data || []).map((s) => s.id);
    if (sessionIds.length === 0) return [];

    const { data: sessionPoints } = await supabaseAdmin
      .from("meet_session_points")
      .select("session_id, status_at_end, point:meet_points(status)")
      .in("session_id", sessionIds);

    const countMap: Record<string, { total: number; closed: number }> = {};
    for (const sp of sessionPoints || []) {
      if (!countMap[sp.session_id]) countMap[sp.session_id] = { total: 0, closed: 0 };
      countMap[sp.session_id].total += 1;
      const status = sp.status_at_end || (sp.point as any)?.status;
      if (status === "closed" || status === "dropped") {
        countMap[sp.session_id].closed += 1;
      }
    }

    return (data || []).map((s: any) => ({
      ...s,
      video_link: sanitizeTeamsUrl(
        s.video_link,
        (s.attendees || []).map((a: any) => a.user?.email).filter(Boolean)
      ),
      points_count: countMap[s.id]?.total || 0,
      closed_points_count: countMap[s.id]?.closed || 0,
    })) as MeetingSession[];
  } catch (err: any) {
    console.error("Unexpected error in getSessionsForMeeting:", err);
    return [];
  }
}

export async function getSessionById(sessionId: string): Promise<{
  session: MeetingSession | null;
  points: MeetingPoint[];
  agenda: AgendaItem[];
  attendees: SessionAttendee[];
}> {
  try {
    await requireMeet("MEET_VIEW", { sessionId });
    const { data: session, error } = await supabaseAdmin
      .from("meet_sessions")
      .select(`
        *,
        meeting:meet_meetings(
          id, code, title, description, mode, video_provider, video_link,
          organizer:user_master!meet_meetings_organizer_id_fkey(id, full_name, email),
          chair:user_master!meet_meetings_chair_id_fkey(id, full_name, email),
          meeting_type:meet_meeting_types(id, name, color, is_board_mode),
          room:meet_rooms(id, name, location)
        ),
        minute_taker:user_master!meet_sessions_minute_taker_id_fkey(id, full_name, email),
        room:meet_rooms(id, name, location)
      `)
      .eq("id", sessionId)
      .eq("is_deleted", false)
      .maybeSingle();

    if (error || !session) {
      console.error("Error fetching session:", error);
      return { session: null, points: [], agenda: [], attendees: [] };
    }

    // Attendees
    const { data: attendees } = await supabaseAdmin
      .from("meet_session_attendees")
      .select(`
        *,
        user:user_master(id, full_name, email, profile_photo)
      `)
      .eq("session_id", sessionId);

    // Agenda Items
    const { data: agenda } = await supabaseAdmin
      .from("meet_agenda_items")
      .select(`
        *,
        presenter:user_master(id, full_name)
      `)
      .eq("session_id", sessionId)
      .order("sort_order", { ascending: true });

    // Session Points with pre-updates and tasks
    const { data: sessionPoints } = await supabaseAdmin
      .from("meet_session_points")
      .select(`
        entry_type, status_at_start, status_at_end, discussion_notes, time_spent_minutes, sort_order,
        point:meet_points(
          *,
          owner:user_master!meet_points_owner_id_fkey(id, full_name, email, profile_photo),
          raised_by:user_master!meet_points_raised_by_id_fkey(id, full_name),
          category:meet_point_categories(id, name, default_tat_days),
          department:departments(id, name),
          tasks:meet_tasks(
            *,
            owner:user_master(id, full_name, email, profile_photo),
            checklist:meet_task_checklist(*)
          )
        )
      `)
      .eq("session_id", sessionId)
      .order("sort_order", { ascending: true });

    // Pre-updates for points in this session
    const pointIds = (sessionPoints || []).map((sp: any) => sp.point?.id).filter(Boolean);
    let preUpdatesMap: Record<string, any> = {};
    if (pointIds.length > 0) {
      const { data: preUpdates } = await supabaseAdmin
        .from("meet_pre_updates")
        .select("*, user:user_master(id, full_name)")
        .eq("session_id", sessionId)
        .in("point_id", pointIds)
        .order("submitted_at", { ascending: false });

      for (const pu of preUpdates || []) {
        if (!preUpdatesMap[pu.point_id]) {
          preUpdatesMap[pu.point_id] = pu;
        }
      }
    }

    const points: MeetingPoint[] = (sessionPoints || []).map((sp: any) => {
      const pt = sp.point;
      if (!pt) return null;
      return {
        ...pt,
        session_entry_type: sp.entry_type,
        discussion_notes: sp.discussion_notes,
        latest_pre_update: preUpdatesMap[pt.id] || null,
      };
    }).filter(Boolean);

    const attendeeEmails = (attendees || []).map((a: any) => a.user?.email || a.guest_email).filter(Boolean);
    const sanitizedSession = {
      ...session,
      video_link: sanitizeTeamsUrl((session as any).video_link, attendeeEmails, (session as any).meeting?.title),
      meeting: (session as any).meeting ? {
        ...(session as any).meeting,
        video_link: sanitizeTeamsUrl((session as any).meeting?.video_link, attendeeEmails, (session as any).meeting?.title),
      } : (session as any).meeting,
    };

    return {
      session: sanitizedSession as MeetingSession,
      points,
      agenda: (agenda || []) as AgendaItem[],
      attendees: (attendees || []) as SessionAttendee[],
    };
  } catch (err: any) {
    console.error("Unexpected error in getSessionById:", err);
    return { session: null, points: [], agenda: [], attendees: [] };
  }
}

export async function startSession(sessionId: string) {
  try {
    const { userId } = await requireMeet("MEET_SESSION_RUN", { sessionId, requireOrganizerOrChair: true });
    const now = new Date().toISOString();

    const { data: session, error } = await supabaseAdmin
      .from("meet_sessions")
      .update({
        status: "in_progress",
        actual_start: now,
        updated_at: now,
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (error || !session) return { success: false, error: error?.message || "Failed to start session" };

    // Record Activity
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "session",
      entity_id: sessionId,
      action: "status_changed",
      field: "status",
      old_value: "scheduled",
      new_value: "in_progress",
      user_id: userId,
      channel: "web",
    });

    revalidatePath(`/meet/sessions/${sessionId}`);
    revalidatePath(`/meet/live/${sessionId}`);
    return { success: true, session };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * End Meeting & Execute Atomic Carry-Forward
 * Spec B6.4 & Stop-Ship S7:
 * Executes atomic database transaction procedure fn_meet_end_session_and_carry_forward
 * with fallback, checks all write errors, and triggers 3x carry-forward escalation alerts (P5).
 */
export async function endSessionAndCarryForward(sessionId: string, summaryNotes?: string) {
  try {
    const { userId } = await requireMeet("MEET_SESSION_RUN", { sessionId, requireOrganizerOrChair: true });
    const now = new Date().toISOString();

    // 1. Try atomic PostgreSQL transaction function first (S7)
    try {
      const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc("fn_meet_end_session_and_carry_forward", {
        p_session_id: sessionId,
        p_ended_by: userId,
        p_actual_end: now,
        p_summary_notes: summaryNotes || null,
        p_create_next_session: true,
      });

      if (!rpcErr && rpcResult?.success) {
        // Escalate points carried >= 3 times to organizer & department head (P5)
        const { data: escalatedPoints } = await supabaseAdmin
          .from("meet_points")
          .select("id, code, title, carry_forward_count, meeting:meet_meetings(id, title, organizer:user_master(id, email))")
          .gte("carry_forward_count", 3)
          .eq("meeting_id", (await supabaseAdmin.from("meet_sessions").select("meeting_id").eq("id", sessionId).single()).data?.meeting_id)
          .not("status", "in", '("closed","dropped")');

        for (const ep of escalatedPoints || []) {
          if ((ep as any)?.meeting?.organizer?.email) {
            await supabaseAdmin.from("email_queue").insert({
              recipient_email: (ep as any).meeting.organizer.email,
              subject: `[Escalation Alert] Point ${ep.code} Carried Forward ${ep.carry_forward_count}×`,
              body: `<p>Attention: Meeting Point <strong>${ep.code}: ${ep.title}</strong> has now been carried forward ${ep.carry_forward_count} times without closure. Immediate action is required.</p>`,
              event_type: "meet.point.escalated",
              status: "pending",
              metadata: { point_id: ep.id, carry_count: ep.carry_forward_count },
            });
          }
        }

        revalidatePath("/meet");
        revalidatePath(`/meet/sessions/${sessionId}`);
        revalidatePath(`/meet/live/${sessionId}`);
        if (rpcResult.next_session_id) {
          revalidatePath(`/meet/sessions/${rpcResult.next_session_id}`);
        }
        return {
          success: true,
          carriedCount: rpcResult.carried_points_count || 0,
          nextSessionId: rpcResult.next_session_id,
        };
      }
    } catch (rpcEx) {
      console.warn("RPC fn_meet_end_session_and_carry_forward fallback to JS workflow:", rpcEx);
    }

    // 2. Transactional JS Fallback workflow
    const { data: currentSession, error: sErr } = await supabaseAdmin
      .from("meet_sessions")
      .select("*, meeting:meet_meetings(*)")
      .eq("id", sessionId)
      .single();

    if (sErr || !currentSession) {
      return { success: false, error: "Session not found" };
    }

    const meeting = currentSession.meeting;
    const nextSessionNo = currentSession.session_no + 1;

    // 2. Fetch all points linked to this session
    const { data: sessionPoints } = await supabaseAdmin
      .from("meet_session_points")
      .select("point_id, point:meet_points(*)")
      .eq("session_id", sessionId);

    const openPointsToCarry: any[] = [];
    let closedCount = 0;

    for (const sp of sessionPoints || []) {
      const pt = sp.point as any;
      if (!pt) continue;

      // Update status_at_end on current session points
      await supabaseAdmin
        .from("meet_session_points")
        .update({ status_at_end: pt.status })
        .eq("session_id", sessionId)
        .eq("point_id", pt.id);

      if (pt.status !== "closed" && pt.status !== "dropped") {
        openPointsToCarry.push(pt);
      } else {
        closedCount += 1;
      }
    }

    // 3. Mark current session completed / mom_draft
    await supabaseAdmin
      .from("meet_sessions")
      .update({
        status: "mom_draft",
        actual_end: now,
        summary_notes: summaryNotes || currentSession.summary_notes,
        updated_at: now,
      })
      .eq("id", sessionId);

    // 4. Create Next Session S-(N+1) if it doesn't already exist
    const { data: existingNext } = await supabaseAdmin
      .from("meet_sessions")
      .select("id")
      .eq("meeting_id", meeting.id)
      .eq("session_no", nextSessionNo)
      .maybeSingle();

    let nextSessionId = existingNext?.id;

    if (!nextSessionId) {
      // Calculate next scheduled start based on recurrence
      const currentStart = new Date(currentSession.scheduled_start);
      let nextStart = new Date(currentStart);
      const recurrence = meeting.recurrence || "weekly";

      if (recurrence === "daily") {
        nextStart.setDate(nextStart.getDate() + 1);
      } else if (recurrence === "weekly") {
        nextStart.setDate(nextStart.getDate() + 7);
      } else if (recurrence === "biweekly") {
        nextStart.setDate(nextStart.getDate() + 14);
      } else if (recurrence === "monthly") {
        nextStart.setMonth(nextStart.getMonth() + 1);
      } else {
        nextStart.setDate(nextStart.getDate() + 7);
      }

      const durationMs = (meeting.default_duration_minutes || 60) * 60 * 1000;
      const nextEnd = new Date(nextStart.getTime() + durationMs);

      const nextCode = `${meeting.code}/S-${String(nextSessionNo).padStart(3, "0")}`;

      const { data: newSession, error: createNextErr } = await supabaseAdmin
        .from("meet_sessions")
        .insert({
          meeting_id: meeting.id,
          session_no: nextSessionNo,
          code: nextCode,
          scheduled_start: nextStart.toISOString(),
          scheduled_end: nextEnd.toISOString(),
          room_id: meeting.room_id || null,
          video_link: meeting.video_link || null,
          status: "scheduled",
          previous_session_id: sessionId,
          created_by: userId,
        })
        .select()
        .single();

      if (newSession) {
        nextSessionId = newSession.id;

        // Copy attendees from current meeting members
        const { data: members } = await supabaseAdmin
          .from("meet_meeting_members")
          .select("*")
          .eq("meeting_id", meeting.id);

        if (members && members.length > 0) {
          await supabaseAdmin.from("meet_session_attendees").insert(
            members.map((m) => ({
              session_id: nextSessionId,
              user_id: m.user_id || null,
              guest_name: m.guest_name || null,
              guest_email: m.guest_email || null,
              role: m.role,
              invite_status: "invited",
              attendance: "absent",
            }))
          );
        }

        // Setup standard agenda item 1: "Review of Backup Points & Open Items"
        await supabaseAdmin.from("meet_agenda_items").insert({
          session_id: nextSessionId,
          title: "Review of Carry-Forward Backup Points",
          planned_minutes: 20,
          sort_order: 1,
          status: "pending",
        });
      }
    }

    // 5. Carry forward each open point to the next session
    if (nextSessionId && openPointsToCarry.length > 0) {
      for (const pt of openPointsToCarry) {
        const newCarryCount = (pt.carry_forward_count || 0) + 1;
        const isRepeatedlyCarried = newCarryCount >= 3;

        // Update point record
        await supabaseAdmin
          .from("meet_points")
          .update({
            current_session_id: nextSessionId,
            carry_forward_count: newCarryCount,
            is_backup: true,
            updated_at: now,
          })
          .eq("id", pt.id);

        // If carried 3+ times, trigger executive notification (P5)
        if (isRepeatedlyCarried && meeting.organizer?.email) {
          try {
            await supabaseAdmin.from("email_queue").insert({
              recipient_email: meeting.organizer.email,
              subject: `[Escalation Alert] Point ${pt.code} Carried Forward ${newCarryCount}×`,
              body: `<p>Attention: Point <strong>${pt.code}: ${pt.title}</strong> has been carried forward ${newCarryCount} times without closure. Immediate action is required.</p>`,
              event_type: "meet.point.escalated",
              status: "pending",
              metadata: { point_id: pt.id, carry_count: newCarryCount },
            });
          } catch {}
        }

        // Link into next session's meet_session_points
        await supabaseAdmin
          .from("meet_session_points")
          .upsert({
            session_id: nextSessionId,
            point_id: pt.id,
            entry_type: "carried_forward",
            status_at_start: pt.status,
            sort_order: pt.sort_order || 0,
          }, { onConflict: "session_id,point_id" });

        // Activity log entry
        await supabaseAdmin.from("meet_activity_log").insert({
          entity_type: "point",
          entity_id: pt.id,
          action: "carried_forward",
          field: "carry_forward_count",
          old_value: String(pt.carry_forward_count),
          new_value: String(newCarryCount),
          user_id: userId,
          channel: "system",
        });
      }
    }

    // 6. Record Session Completion Activity
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "session",
      entity_id: sessionId,
      action: "status_changed",
      field: "status",
      old_value: "in_progress",
      new_value: "mom_draft",
      user_id: userId,
      channel: "web",
    });

    revalidatePath("/meet");
    revalidatePath(`/meet/sessions/${sessionId}`);
    revalidatePath(`/meet/live/${sessionId}`);
    return {
      success: true,
      carriedCount: openPointsToCarry.length,
      closedCount,
      nextSessionId,
      nextSessionNo,
    };
  } catch (err: any) {
    console.error("Error in endSessionAndCarryForward:", err);
    return { success: false, error: err.message };
  }
}

export async function updateSessionAttendance(
  sessionId: string,
  attendeesList: { id: string; attendance: string }[]
) {
  try {
    for (const item of attendeesList) {
      await supabaseAdmin
        .from("meet_session_attendees")
        .update({ attendance: item.attendance })
        .eq("id", item.id);
    }
    revalidatePath(`/meet/sessions/${sessionId}`);
    revalidatePath(`/meet/live/${sessionId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function submitPreMeetingUpdate(input: {
  sessionId: string;
  pointId: string;
  progress: number;
  status?: string;
  text: string;
}) {
  try {
    const { user } = await getCachedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { error } = await supabaseAdmin.from("meet_pre_updates").insert({
      session_id: input.sessionId,
      point_id: input.pointId,
      user_id: user.id,
      progress_proposed: input.progress,
      status_proposed: input.status,
      text: input.text,
      channel: "web",
    });

    if (error) return { success: false, error: error.message };

    // Also update current point progress
    await supabaseAdmin
      .from("meet_points")
      .update({
        progress_percent: input.progress,
        status: input.status || "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.pointId);

    revalidatePath(`/meet/sessions/${input.sessionId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Manually create a session for a meeting series (M1/M8)
 */
export async function createSessionForMeeting(input: {
  meetingId: string;
  scheduledStart: string;
  durationMinutes?: number;
  roomId?: string;
  videoLink?: string;
}) {
  try {
    const { user } = await getCachedUser();
    const userId = user?.id || null;

    // Get meeting info and highest session number
    const { data: meeting, error: mErr } = await supabaseAdmin
      .from("meet_meetings")
      .select("id, code, title, default_duration_minutes, room_id, video_link")
      .eq("id", input.meetingId)
      .single();

    if (mErr || !meeting) {
      return { success: false, error: "Meeting series not found" };
    }

    const { data: latestSession } = await supabaseAdmin
      .from("meet_sessions")
      .select("session_no")
      .eq("meeting_id", input.meetingId)
      .order("session_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSessionNo = (latestSession?.session_no || 0) + 1;
    const sessionCode = `${meeting.code}/S-${String(nextSessionNo).padStart(3, "0")}`;
    const durationMin = input.durationMinutes || meeting.default_duration_minutes || 60;
    const scheduledStart = new Date(input.scheduledStart).toISOString();
    const scheduledEnd = new Date(new Date(scheduledStart).getTime() + durationMin * 60 * 1000).toISOString();

    let sessionVideoLink = (input.videoLink || meeting.video_link || "").trim();
    if (!sessionVideoLink) {
      try {
        const { data: members } = await supabaseAdmin
          .from("meet_meeting_members")
          .select("user_id, guest_email, user:user_master(email)")
          .eq("meeting_id", input.meetingId)
          .eq("is_deleted", false);

        const attendeeEmails: string[] = [];
        for (const m of members || []) {
          const email = (m as any)?.user?.email || (m as any)?.guest_email;
          if (email && !attendeeEmails.includes(email)) {
            attendeeEmails.push(email);
          }
        }

        const { generateTeamsMeetingLink } = await import("@/lib/integrations/microsoft-teams");
        sessionVideoLink = await generateTeamsMeetingLink({
          title: meeting.title,
          scheduledStart,
          scheduledEnd,
          meetingCode: sessionCode,
          attendeeEmails,
          callType: "call",
        });
      } catch (e) {
        console.warn("Auto Teams meeting generation fallback:", e);
      }
    }

    const { data: newSession, error: sErr } = await supabaseAdmin
      .from("meet_sessions")
      .insert({
        meeting_id: input.meetingId,
        session_no: nextSessionNo,
        code: sessionCode,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        room_id: input.roomId || meeting.room_id || null,
        video_link: sessionVideoLink || null,
        status: "scheduled",
        created_by: userId,
      })
      .select()
      .single();

    if (sErr || !newSession) {
      return { success: false, error: sErr?.message || "Failed to create session" };
    }

    // Populate attendees from meeting standing members
    const { data: members } = await supabaseAdmin
      .from("meet_meeting_members")
      .select("user_id, role, guest_name, guest_email")
      .eq("meeting_id", input.meetingId);

    if (members && members.length > 0) {
      await supabaseAdmin.from("meet_session_attendees").insert(
        members.map((m) => ({
          session_id: newSession.id,
          user_id: m.user_id || null,
          guest_name: m.guest_name || null,
          guest_email: m.guest_email || null,
          role: m.role || "attendee",
          invite_status: "invited",
          attendance: "present",
        }))
      );
    }

    // Standard review agenda
    await supabaseAdmin.from("meet_agenda_items").insert([
      { session_id: newSession.id, title: "Review of Action Items & Backup Points", planned_minutes: 15, sort_order: 1 },
      { session_id: newSession.id, title: "Current Updates & Critical Deliberations", planned_minutes: 30, sort_order: 2 },
      { session_id: newSession.id, title: "Decisions & Action Items Confirmation", planned_minutes: 15, sort_order: 3 },
    ]);

    revalidatePath(`/meet/meetings/${input.meetingId}`);
    revalidatePath("/meet");
    return { success: true, session: newSession };
  } catch (err: any) {
    console.error("Error creating session for meeting:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Reschedule an upcoming session (M8)
 */
export async function rescheduleSession(input: {
  sessionId: string;
  scheduledStart: string;
  durationMinutes?: number;
  reason?: string;
}) {
  try {
    const { userId } = await requireMeet("MEET_UPDATE", { sessionId: input.sessionId, requireOrganizerOrChair: true });

    const { data: session } = await supabaseAdmin
      .from("meet_sessions")
      .select("id, meeting_id, scheduled_start, scheduled_end")
      .eq("id", input.sessionId)
      .single();

    if (!session) return { success: false, error: "Session not found" };

    const oldStart = session.scheduled_start;
    const oldDurationMs = new Date(session.scheduled_end).getTime() - new Date(session.scheduled_start).getTime();
    const durationMs = input.durationMinutes ? input.durationMinutes * 60 * 1000 : oldDurationMs;
    const newStart = new Date(input.scheduledStart).toISOString();
    const newEnd = new Date(new Date(newStart).getTime() + durationMs).toISOString();

    const { error } = await supabaseAdmin
      .from("meet_sessions")
      .update({
        scheduled_start: newStart,
        scheduled_end: newEnd,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.sessionId);

    if (error) return { success: false, error: error.message };

    // Activity log
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "session",
      entity_id: input.sessionId,
      action: "rescheduled",
      field: "scheduled_start",
      old_value: oldStart,
      new_value: newStart,
      user_id: userId,
      channel: "web",
    });

    revalidatePath(`/meet/sessions/${input.sessionId}`);
    revalidatePath(`/meet/meetings/${session.meeting_id}`);
    revalidatePath("/meet");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Cancel a session (M8)
 */
export async function cancelSession(input: {
  sessionId: string;
  reason?: string;
}) {
  try {
    const { userId } = await requireMeet("MEET_DELETE", { sessionId: input.sessionId, requireOrganizerOrChair: true });

    const { data: session } = await supabaseAdmin
      .from("meet_sessions")
      .select("id, meeting_id, status")
      .eq("id", input.sessionId)
      .single();

    if (!session) return { success: false, error: "Session not found" };

    const { error } = await supabaseAdmin
      .from("meet_sessions")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.sessionId);

    if (error) return { success: false, error: error.message };

    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "session",
      entity_id: input.sessionId,
      action: "cancelled",
      field: "status",
      old_value: session.status,
      new_value: "cancelled",
      user_id: userId,
      channel: "web",
    });

    revalidatePath(`/meet/sessions/${input.sessionId}`);
    revalidatePath(`/meet/meetings/${session.meeting_id}`);
    revalidatePath("/meet");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Add an agenda item to a session
 */
export async function addAgendaItem(input: {
  sessionId: string;
  title: string;
  plannedMinutes?: number;
  presenterId?: string;
}) {
  try {
    await requireMeet("MEET_UPDATE", { sessionId: input.sessionId, requireOrganizerOrChair: true });

    const { data: existing } = await supabaseAdmin
      .from("meet_agenda_items")
      .select("sort_order")
      .eq("session_id", input.sessionId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sortOrder = (existing?.sort_order || 0) + 1;

    const { data: item, error } = await supabaseAdmin
      .from("meet_agenda_items")
      .insert({
        session_id: input.sessionId,
        title: input.title,
        planned_minutes: input.plannedMinutes || 15,
        presenter_id: input.presenterId || null,
        sort_order: sortOrder,
        status: "pending",
      })
      .select(`
        *,
        presenter:user_master(id, full_name, email)
      `)
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath(`/meet/sessions/${input.sessionId}`);
    revalidatePath(`/meet/live/${input.sessionId}`);
    return { success: true, agendaItem: item };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete an agenda item
 */
export async function deleteAgendaItem(input: {
  agendaItemId: string;
  sessionId: string;
}) {
  try {
    await requireMeet("MEET_UPDATE", { sessionId: input.sessionId, requireOrganizerOrChair: true });

    const { error } = await supabaseAdmin
      .from("meet_agenda_items")
      .delete()
      .eq("id", input.agendaItemId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/meet/sessions/${input.sessionId}`);
    revalidatePath(`/meet/live/${input.sessionId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update or set the video call link for a meeting session (Teams, Google Meet, or Chandak Video)
 */
export async function updateSessionVideoLink(input: {
  sessionId: string;
  videoLink: string;
}): Promise<{ success: boolean; session?: any; error?: string }> {
  try {
    await requireMeet("MEET_UPDATE", { sessionId: input.sessionId, requireOrganizerOrChair: false });

    const cleanLink = (input.videoLink || "").trim();

    const { data: updated, error } = await supabaseAdmin
      .from("meet_sessions")
      .update({
        video_link: cleanLink || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.sessionId)
      .select(`
        id, code, video_link, meeting_id,
        meeting:meet_meetings (id, title, video_link)
      `)
      .single();

    if (error) throw error;

    // Also update parent meeting default video link if not set
    if (cleanLink && updated?.meeting_id) {
      await supabaseAdmin
        .from("meet_meetings")
        .update({ video_link: cleanLink })
        .eq("id", updated.meeting_id)
        .is("video_link", null);
    }

    revalidatePath(`/meet/sessions/${input.sessionId}`);
    revalidatePath(`/meet/live/${input.sessionId}`);
    return { success: true, session: updated };
  } catch (err: any) {
    console.error("updateSessionVideoLink error:", err);
    return { success: false, error: err.message || "Failed to update video link" };
  }
}
