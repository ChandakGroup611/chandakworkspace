import { supabaseAdmin } from "@/lib/supabase/service_role";

/**
 * Adds people to a meeting: as standing members of the series and as attendees of its upcoming
 * (scheduled) dates. Used when a point or task is given to someone who wasn't in the meeting yet.
 * Existing members/attendees are left as they are.
 */
export async function addPeopleToMeeting(meetingId: string, userIds: string[]): Promise<number> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!meetingId || !ids.length) return 0;
  const [{ data: mtg }, { data: members }, { data: upcoming }] = await Promise.all([
    supabaseAdmin.from("meet_meetings").select("organizer_id, chair_id, default_minute_taker_id").eq("id", meetingId).maybeSingle(),
    supabaseAdmin.from("meet_meeting_members").select("user_id").eq("meeting_id", meetingId),
    supabaseAdmin
      .from("meet_sessions")
      .select("id")
      .eq("meeting_id", meetingId)
      .eq("is_deleted", false)
      .in("status", ["scheduled", "in_progress"])
      .gte("scheduled_start", new Date(Date.now() - 6 * 3600000).toISOString()),
  ]);
  const core = new Set([mtg?.organizer_id, mtg?.chair_id, mtg?.default_minute_taker_id].filter(Boolean) as string[]);
  const have = new Set((members || []).map((m: any) => m.user_id).filter(Boolean));
  const newMembers = ids.filter((id) => !have.has(id) && !core.has(id));
  if (newMembers.length) {
    await supabaseAdmin.from("meet_meeting_members").insert(newMembers.map((uid) => ({ meeting_id: meetingId, user_id: uid, role: "required" })));
  }
  const sessionIds = (upcoming || []).map((s: any) => s.id);
  if (sessionIds.length) {
    const { data: att } = await supabaseAdmin.from("meet_session_attendees").select("session_id, user_id").in("session_id", sessionIds).in("user_id", ids);
    const present = new Set((att || []).map((a: any) => `${a.session_id}:${a.user_id}`));
    const rows = sessionIds.flatMap((sid) => ids.filter((uid) => !present.has(`${sid}:${uid}`)).map((uid) => ({ session_id: sid, user_id: uid, role: "required", invite_status: "invited", attendance: "absent" })));
    if (rows.length) await supabaseAdmin.from("meet_session_attendees").insert(rows);
  }
  return newMembers.length;
}
