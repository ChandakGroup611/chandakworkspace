import { supabaseAdmin } from "@/lib/supabase/service_role";

/**
 * Confidential meetings the user may NOT see (Spec A14.5 / S3).
 * Returns an empty set for Super/Meet admins. Lists filter rows whose meeting id is in this set.
 */
export async function getHiddenConfidentialMeetingIds(
  userId: string,
  isAdmin: boolean
): Promise<Set<string>> {
  if (isAdmin) return new Set();

  const { data: confidential } = await supabaseAdmin
    .from("meet_meetings")
    .select("id, organizer_id, chair_id, default_minute_taker_id")
    .eq("is_confidential", true)
    .eq("is_deleted", false);

  if (!confidential || confidential.length === 0) return new Set();

  const { data: memberships } = await supabaseAdmin
    .from("meet_meeting_members")
    .select("meeting_id")
    .eq("user_id", userId)
    .in(
      "meeting_id",
      confidential.map((m) => m.id)
    );
  const memberOf = new Set((memberships || []).map((m) => m.meeting_id));

  return new Set(
    confidential
      .filter(
        (m) =>
          m.organizer_id !== userId &&
          m.chair_id !== userId &&
          m.default_minute_taker_id !== userId &&
          !memberOf.has(m.id)
      )
      .map((m) => m.id)
  );
}

/**
 * Meetings and sessions the user takes part in: organiser, chair, minute taker,
 * a standing member of the meeting, or an attendee on a session.
 * Used by personal screens (Meet home, Live mode) so they never show other people's meetings.
 */
export async function getMyMeetScope(
  userId: string
): Promise<{ meetingIds: Set<string>; sessionIds: Set<string> }> {
  const [ownedRes, memberRes, attendeeRes] = await Promise.all([
    supabaseAdmin
      .from("meet_meetings")
      .select("id")
      .eq("is_deleted", false)
      .or(`organizer_id.eq.${userId},chair_id.eq.${userId},default_minute_taker_id.eq.${userId}`),
    supabaseAdmin.from("meet_meeting_members").select("meeting_id").eq("user_id", userId),
    supabaseAdmin.from("meet_session_attendees").select("session_id").eq("user_id", userId),
  ]);

  const meetingIds = new Set<string>();
  (ownedRes.data || []).forEach((m: any) => m?.id && meetingIds.add(m.id));
  (memberRes.data || []).forEach((m: any) => m?.meeting_id && meetingIds.add(m.meeting_id));

  const sessionIds = new Set<string>();
  (attendeeRes.data || []).forEach((a: any) => a?.session_id && sessionIds.add(a.session_id));

  return { meetingIds, sessionIds };
}
