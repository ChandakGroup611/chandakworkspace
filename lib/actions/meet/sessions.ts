"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";
import { revalidatePath } from "next/cache";
import type { MeetingSession, SessionAttendee, AgendaItem, MeetingPoint } from "@/types/meet";

export async function getSessionsForMeeting(meetingId: string): Promise<MeetingSession[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("meet_sessions")
      .select(`
        *,
        minute_taker:user_master(id, full_name, email),
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

    return (data || []).map((s) => ({
      ...s,
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
        minute_taker:user_master(id, full_name, email),
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

    return {
      session: session as MeetingSession,
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
    const { user } = await getCachedUser();
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
      user_id: user?.id || null,
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
 * Spec B6.4:
 * 1. Find or create the next session S-(N+1) of the same meeting.
 * 2. For every open/in_progress point:
 *    - Carry forward to next session (entry_type = 'carried_forward')
 *    - Increment carry_forward_count
 *    - Set is_backup = true
 *    - Update current_session_id
 *    - If carry_forward_count >= 3 flag repeatedly_carried
 * 3. Update closing session to 'completed' / 'mom_draft'
 */
export async function endSessionAndCarryForward(sessionId: string, summaryNotes?: string) {
  try {
    const { user } = await getCachedUser();
    const userId = user?.id || null;
    const now = new Date().toISOString();

    // 1. Get current session and meeting details
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
              attendance: "present",
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
