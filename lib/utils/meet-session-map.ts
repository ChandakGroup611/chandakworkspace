import { supabaseAdmin } from "@/lib/supabase/service_role";

/**
 * Shared shape and loaders for "a meeting occurrence as a row" in the redesigned Chandak Meet
 * screens (Home, Meetings list, meeting page). Server-only helpers; read-only.
 */

export interface MeetSessionRow {
  id: string;
  code: string;
  scheduled_start: string;
  scheduled_end: string | null;
  status: string;
  video_link: string | null;
  room_name: string | null;
  meeting_id: string | null;
  meeting_title: string;
  meeting_code: string | null;
  department_name: string | null;
  recurrence: string | null;
  mode: string | null;
  invited: number;
  accepted: number;
  carried_points: number;
  i_am_organizer: boolean;
}

export const SESSION_ROW_SELECT = `
  id, code, scheduled_start, scheduled_end, status, video_link, minute_taker_id,
  room:meet_rooms(name),
  meeting:meet_meetings(id, title, code, recurrence, mode, video_link, organizer_id, chair_id, department:departments(name))
`;

function one<T = any>(v: any): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v ?? null;
}

/** Invite counts and carried-forward point counts for a set of sessions. */
export async function loadSessionCounts(sessionIds: string[]) {
  const inviteMap = new Map<string, { invited: number; accepted: number }>();
  const carriedMap = new Map<string, number>();
  if (!sessionIds.length) return { inviteMap, carriedMap };
  const [attRes, carryRes] = await Promise.all([
    supabaseAdmin.from("meet_session_attendees").select("session_id, invite_status").in("session_id", sessionIds),
    supabaseAdmin.from("meet_session_points").select("session_id").eq("entry_type", "carried_forward").in("session_id", sessionIds),
  ]);
  (attRes.data || []).forEach((a: any) => {
    const cur = inviteMap.get(a.session_id) || { invited: 0, accepted: 0 };
    cur.invited += 1;
    if (a.invite_status === "accepted") cur.accepted += 1;
    inviteMap.set(a.session_id, cur);
  });
  (carryRes.data || []).forEach((c: any) => carriedMap.set(c.session_id, (carriedMap.get(c.session_id) || 0) + 1));
  return { inviteMap, carriedMap };
}

export function mapSessionRow(
  s: any,
  userId: string,
  counts: { inviteMap: Map<string, { invited: number; accepted: number }>; carriedMap: Map<string, number> }
): MeetSessionRow {
  const m = one<any>(s.meeting);
  const r = one<any>(s.room);
  const d = one<any>(m?.department);
  const inv = counts.inviteMap.get(s.id) || { invited: 0, accepted: 0 };
  return {
    id: s.id,
    code: s.code,
    scheduled_start: s.scheduled_start,
    scheduled_end: s.scheduled_end || null,
    status: s.status,
    video_link: s.video_link || m?.video_link || null,
    room_name: r?.name || null,
    meeting_id: m?.id || null,
    meeting_title: m?.title || "Meeting",
    meeting_code: m?.code || null,
    department_name: d?.name || null,
    recurrence: m?.recurrence || null,
    mode: m?.mode || null,
    invited: inv.invited,
    accepted: inv.accepted,
    carried_points: counts.carriedMap.get(s.id) || 0,
    i_am_organizer: m?.organizer_id === userId || m?.chair_id === userId,
  };
}

/** PostgREST `.or()` filter for sessions in the user's own scope, or null if they're in no meeting. */
export function myScopeFilter(meetingIds: Set<string>, sessionIds: Set<string>): string | null {
  const parts: string[] = [];
  if (meetingIds.size) parts.push(`meeting_id.in.(${Array.from(meetingIds).join(",")})`);
  if (sessionIds.size) parts.push(`id.in.(${Array.from(sessionIds).join(",")})`);
  return parts.length ? parts.join(",") : null;
}
