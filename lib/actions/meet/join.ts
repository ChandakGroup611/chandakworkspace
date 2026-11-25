"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { autoCheckIn, classifyJoin, graceMinutes } from "@/lib/utils/meet-attendance";

/**
 * Join screen, "Ask to join" and "Admit / Deny" (Chandak Meet redesign, stage 4).
 *
 * No new table: a join request is a row in meet_session_attendees with role = 'requested'
 * and invite_status = 'requested'. Admit turns it into a normal attendee (role 'optional',
 * invite 'accepted', attendance 'present'); Deny keeps the row as a record (role 'denied',
 * invite 'declined'). Nothing is ever deleted.
 *
 * Lobby rule: the organiser, chair, minute taker, standing members and anyone on the invite
 * list go straight in. Every other signed-in Chandak Meet user can ask, and waits for a host.
 */

const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export interface JoinContext {
  sessionId: string;
  sessionCode: string | null;
  status: string;
  scheduledStart: string;
  scheduledEnd: string | null;
  meetingId: string | null;
  meetingTitle: string;
  meetingCode: string | null;
  videoLink: string | null;
  roomName: string | null;
  isHost: boolean;
  canEnter: boolean;
  request: "none" | "requested" | "admitted" | "denied";
  presentNames: string[];
  carriedPoints: number;
}

async function loadSession(sessionId: string) {
  const { data } = await supabaseAdmin
    .from("meet_sessions")
    .select(`
      id, code, status, scheduled_start, scheduled_end, video_link, minute_taker_id, meeting_id,
      room:meet_rooms(name),
      meeting:meet_meetings(id, title, code, organizer_id, chair_id, default_minute_taker_id, video_link, is_confidential)
    `)
    .eq("id", sessionId)
    .eq("is_deleted", false)
    .maybeSingle();
  return data as any;
}

async function roleFor(userId: string, s: any, isAdmin: boolean) {
  const m = one(s.meeting);
  const isHost =
    isAdmin ||
    m?.organizer_id === userId ||
    m?.chair_id === userId ||
    s.minute_taker_id === userId ||
    m?.default_minute_taker_id === userId;

  const [memberRes, attRes] = await Promise.all([
    m?.id
      ? supabaseAdmin.from("meet_meeting_members").select("id").eq("meeting_id", m.id).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null } as any),
    supabaseAdmin.from("meet_session_attendees").select("id, role, invite_status, check_in_method").eq("session_id", s.id).eq("user_id", userId).maybeSingle(),
  ]);
  const att: any = attRes.data;
  const request: JoinContext["request"] =
    att?.role === "requested" ? "requested" : att?.role === "denied" ? "denied" : att?.check_in_method === "admitted" ? "admitted" : "none";
  const invited = !!att && att.role !== "requested" && att.role !== "denied";
  const canEnter = isHost || !!memberRes.data || invited;
  return { isHost, canEnter, request, attRow: att };
}

/** Meeting code or session code -> the session to join (the live or next one for a meeting code). */
export async function resolveJoinCode(code: string): Promise<{ sessionId?: string; error?: string }> {
  await requireMeet("MEET_VIEW");
  const c = String(code || "").trim().toUpperCase();
  if (!c || c.length > 40 || !/^[A-Z0-9-]+$/.test(c)) return { error: "Enter a meeting ID like MTG-0007 or a session code." };

  const { data: s } = await supabaseAdmin.from("meet_sessions").select("id").ilike("code", c).eq("is_deleted", false).maybeSingle();
  if (s?.id) return { sessionId: s.id };

  const { data: m } = await supabaseAdmin.from("meet_meetings").select("id").ilike("code", c).eq("is_deleted", false).maybeSingle();
  if (!m?.id) return { error: "No meeting found with that ID." };

  const { data: sessions } = await supabaseAdmin
    .from("meet_sessions")
    .select("id, status, scheduled_start")
    .eq("meeting_id", m.id)
    .eq("is_deleted", false)
    .in("status", ["in_progress", "scheduled"])
    .gte("scheduled_start", new Date(Date.now() - 6 * 3600000).toISOString())
    .order("scheduled_start", { ascending: true })
    .limit(5);
  const pick = (sessions || []).find((x: any) => x.status === "in_progress") || (sessions || [])[0];
  if (!pick) return { error: "That meeting has nothing scheduled right now." };
  return { sessionId: pick.id };
}

export async function getJoinContext(sessionId: string): Promise<JoinContext | null> {
  const auth = await requireMeet("MEET_VIEW");
  const s = await loadSession(sessionId);
  if (!s) return null;
  const m = one(s.meeting);
  const r = one(s.room);
  const { isHost, canEnter, request } = await roleFor(auth.userId, s, auth.isSuperAdmin || auth.isMeetAdmin);

  const [presentRes, carriedRes] = await Promise.all([
    supabaseAdmin
      .from("meet_session_attendees")
      .select("user:user_master!meet_session_attendees_user_id_fkey(full_name), guest_name, check_in_at, role")
      .eq("session_id", sessionId)
      .not("check_in_at", "is", null)
      .limit(20),
    supabaseAdmin.from("meet_session_points").select("id", { count: "exact", head: true }).eq("session_id", sessionId).eq("entry_type", "carried_forward"),
  ]);

  // Confidential meetings: people who aren't part of it only see the title, nothing else.
  const restricted = !!m?.is_confidential && !canEnter;

  return {
    sessionId: s.id,
    sessionCode: s.code || null,
    status: s.status,
    scheduledStart: s.scheduled_start,
    scheduledEnd: s.scheduled_end || null,
    meetingId: m?.id || null,
    meetingTitle: m?.title || "Meeting",
    meetingCode: m?.code || null,
    videoLink: canEnter || request === "admitted" ? s.video_link || m?.video_link || null : null,
    roomName: restricted ? null : r?.name || null,
    isHost,
    canEnter: canEnter || request === "admitted",
    request,
    presentNames: restricted
      ? []
      : (presentRes.data || [])
          .filter((a: any) => a.role !== "requested" && a.role !== "denied")
          .map((a: any) => one(a.user)?.full_name || a.guest_name)
          .filter(Boolean),
    carriedPoints: restricted ? 0 : carriedRes.count || 0,
  };
}

/** The signed-in user asks to join a meeting they weren't invited to. */
export async function requestToJoin(sessionId: string): Promise<{ success: boolean; status?: JoinContext["request"]; error?: string }> {
  const auth = await requireMeet("MEET_VIEW");
  const s = await loadSession(sessionId);
  if (!s) return { success: false, error: "Meeting not found." };
  if (["cancelled", "mom_published", "published"].includes(s.status)) return { success: false, error: "This meeting is over." };

  const { canEnter, attRow } = await roleFor(auth.userId, s, auth.isSuperAdmin || auth.isMeetAdmin);
  if (canEnter) return { success: true, status: "admitted" };
  if (attRow?.role === "requested") return { success: true, status: "requested" };

  if (attRow) {
    // Asked before and was denied: ask again
    const { error } = await supabaseAdmin
      .from("meet_session_attendees")
      .update({ role: "requested", invite_status: "requested", attendance: "absent" })
      .eq("id", attRow.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabaseAdmin.from("meet_session_attendees").insert({
      session_id: sessionId,
      user_id: auth.userId,
      role: "requested",
      invite_status: "requested",
      attendance: "absent",
    });
    if (error) return { success: false, error: error.message };
  }

  await supabaseAdmin.from("meet_activity_log").insert({
    entity_type: "session",
    entity_id: sessionId,
    action: "join_requested",
    user_id: auth.userId,
    channel: "web",
  });
  return { success: true, status: "requested" };
}

/** Polled by the waiting screen. */
export async function getMyJoinStatus(sessionId: string): Promise<{ status: JoinContext["request"]; videoLink: string | null }> {
  const auth = await requireMeet("MEET_VIEW");
  const s = await loadSession(sessionId);
  if (!s) return { status: "none", videoLink: null };
  const { canEnter, request } = await roleFor(auth.userId, s, auth.isSuperAdmin || auth.isMeetAdmin);
  const m = one(s.meeting);
  const status = canEnter ? "admitted" : request;
  return { status, videoLink: status === "admitted" ? s.video_link || m?.video_link || null : null };
}

/** Marks the user as present when they join (keeps the first join time). */
export async function markJoined(sessionId: string): Promise<{ success: boolean }> {
  const auth = await requireMeet("MEET_VIEW");
  const { data: att } = await supabaseAdmin
    .from("meet_session_attendees")
    .select("id, check_in_at, role, invite_status")
    .eq("session_id", sessionId)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (!att || att.role === "requested" || att.role === "denied") return { success: false };
  // Joining counts as accepting the invite; the earlier reply stays in the history
  if (att.invite_status !== "accepted") {
    await supabaseAdmin.from("meet_session_attendees").update({ invite_status: "accepted" }).eq("id", att.id);
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "session",
      entity_id: sessionId,
      action: "invite_accepted_on_join",
      field: "invite_status",
      old_value: att.invite_status || "invited",
      new_value: "accepted",
      user_id: auth.userId,
      channel: "web",
    });
  }
  // Present / Late from the time they joined (see lib/utils/meet-attendance.ts)
  if (!att.check_in_at) await autoCheckIn(sessionId, auth.userId, "video_join");
  return { success: true };
}

/**
 * The signed-in person's role in this meeting. isHost: organiser, chair or minute taker of this
 * meeting. isAdmin: Super / Meet admin, who sees the attendee view unless they choose to take over.
 */
export async function getMyMeetingRole(sessionId: string): Promise<{ isHost: boolean; isAdmin: boolean }> {
  const auth = await requireMeet("MEET_VIEW", { sessionId });
  const { isMeetingHost } = await import("@/lib/utils/meet-host");
  const isHost = await isMeetingHost(sessionId, auth.userId, false);
  return { isHost, isAdmin: !!(auth.isSuperAdmin || auth.isMeetAdmin) };
}

export interface JoinRequest {
  id: string;
  userId: string | null;
  name: string;
  email: string | null;
  department: string | null;
  requestedAt: string;
}

async function requireHost(sessionId: string) {
  const auth = await requireMeet("MEET_VIEW");
  const s = await loadSession(sessionId);
  if (!s) throw new Error("Meeting not found.");
  const { isHost } = await roleFor(auth.userId, s, auth.isSuperAdmin || auth.isMeetAdmin);
  if (!isHost) throw new Error("Only the organiser, chair or minute taker can admit people.");
  return auth;
}

export async function getJoinRequests(sessionId: string): Promise<{ requests: JoinRequest[]; isHost: boolean }> {
  try {
    await requireHost(sessionId);
  } catch {
    return { requests: [], isHost: false };
  }
  const { data } = await supabaseAdmin
    .from("meet_session_attendees")
    .select("id, user_id, guest_name, guest_email, created_at, user:user_master!meet_session_attendees_user_id_fkey(full_name, email)")
    .eq("session_id", sessionId)
    .eq("role", "requested")
    .order("created_at", { ascending: true });
  return {
    isHost: true,
    requests: (data || []).map((r: any) => {
      const u = one(r.user);
      return {
        id: r.id,
        userId: r.user_id || null,
        name: u?.full_name || r.guest_name || "Someone",
        email: u?.email || r.guest_email || null,
        department: null,
        requestedAt: r.created_at,
      };
    }),
  };
}

export async function decideJoinRequest(
  sessionId: string,
  attendeeIds: string[],
  decision: "admit" | "deny"
): Promise<{ success: boolean; error?: string }> {
  let auth;
  try {
    auth = await requireHost(sessionId);
  } catch (e: any) {
    return { success: false, error: e?.message || "Not allowed." };
  }
  const ids = (attendeeIds || []).filter(Boolean).slice(0, 50);
  if (!ids.length) return { success: true };

  const patch =
    decision === "admit"
      ? { role: "optional", invite_status: "accepted", attendance: "present", check_in_at: new Date().toISOString(), check_in_method: "admitted" }
      : { role: "denied", invite_status: "declined", attendance: "absent", marked_by: auth.userId };

  const { error } = await supabaseAdmin
    .from("meet_session_attendees")
    .update(patch)
    .eq("session_id", sessionId)
    .eq("role", "requested")
    .in("id", ids);
  // Admitted after the grace minutes: Late
  if (!error && decision === "admit") {
    const { data: s } = await supabaseAdmin.from("meet_sessions").select("scheduled_start").eq("id", sessionId).maybeSingle();
    if (s) {
      const c = classifyJoin(new Date().toISOString(), s.scheduled_start, await graceMinutes());
      if (c.attendance === "late") await supabaseAdmin.from("meet_session_attendees").update({ attendance: "late", late_minutes: c.late_minutes }).eq("session_id", sessionId).in("id", ids);
    }
  }
  if (error) return { success: false, error: error.message };

  await supabaseAdmin.from("meet_activity_log").insert(
    ids.map((id) => ({
      entity_type: "session",
      entity_id: sessionId,
      action: decision === "admit" ? "join_admitted" : "join_denied",
      new_value: id,
      user_id: auth!.userId,
      channel: "web",
    }))
  );
  return { success: true };
}
