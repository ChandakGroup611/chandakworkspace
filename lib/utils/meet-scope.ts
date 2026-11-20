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
