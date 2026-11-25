import { supabaseAdmin } from "@/lib/supabase/service_role";

const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

/**
 * Who runs a meeting date: organiser, chair, the minute taker (this date's or the default),
 * or a Super / Meet admin. Attendees can see everything but not run the meeting.
 */
export async function isMeetingHost(sessionId: string, userId: string, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true;
  const { data: s } = await supabaseAdmin
    .from("meet_sessions")
    .select("minute_taker_id, meeting:meet_meetings(organizer_id, chair_id, default_minute_taker_id)")
    .eq("id", sessionId)
    .maybeSingle();
  const m: any = one((s as any)?.meeting);
  return [m?.organizer_id, m?.chair_id, m?.default_minute_taker_id, (s as any)?.minute_taker_id].includes(userId);
}

export const NOT_HOST = "Only the organiser, chair or minute taker can do this during the meeting.";
