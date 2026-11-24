import { supabaseAdmin } from "@/lib/supabase/service_role";
import { queueBusinessEvent } from "@/lib/actions/notification-engine";
import type { MeetEventName, MeetRecipientRole } from "@/lib/utils/meet-email-config";

export { MEET_EVENTS, MEET_RECIPIENTS, MEET_MERGE_TAGS } from "@/lib/utils/meet-email-config";

/**
 * Every Chandak Meet email goes through here, and through the company's own notification engine:
 * the Meet email editor (or Settings › Communication) holds, per event, the subject and body the
 * admin wrote and who gets it; it is sent through our SMTP. No template or no recipients for an
 * event means no email: there is no built-in text.
 *
 * Give the meeting or session and the standard people (organiser, chair, minute taker, everyone
 * invited) are looked up here, so the admin can send any event to any of them.
 */

const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export type MeetRecipients = Partial<Record<MeetRecipientRole, (string | null | undefined)[]>>;

async function standardPeople(sessionId?: string, meetingId?: string): Promise<{ roles: MeetRecipients; organiserName: string }> {
  let mid = meetingId || null;
  let sessionMinuteTaker: string | null = null;
  if (sessionId) {
    const { data: s } = await supabaseAdmin.from("meet_sessions").select("meeting_id, minute_taker_id").eq("id", sessionId).maybeSingle();
    mid = mid || (s as any)?.meeting_id || null;
    sessionMinuteTaker = (s as any)?.minute_taker_id || null;
  }
  if (!mid) return { roles: {}, organiserName: "" };

  const [{ data: m }, attRes, memRes] = await Promise.all([
    supabaseAdmin
      .from("meet_meetings")
      .select("organizer_id, chair_id, default_minute_taker_id, organizer:user_master!meet_meetings_organizer_id_fkey(full_name)")
      .eq("id", mid)
      .maybeSingle(),
    sessionId
      ? supabaseAdmin.from("meet_session_attendees").select("user_id, role, invite_status").eq("session_id", sessionId)
      : Promise.resolve({ data: null } as any),
    supabaseAdmin.from("meet_meeting_members").select("user_id").eq("meeting_id", mid),
  ]);

  const invited = sessionId
    ? ((attRes as any).data || [])
        .filter((a: any) => a.user_id && a.role !== "requested" && a.role !== "denied" && a.invite_status !== "declined")
        .map((a: any) => a.user_id)
    : ((memRes as any).data || []).map((r: any) => r.user_id);

  return {
    organiserName: one((m as any)?.organizer)?.full_name || "",
    roles: {
      "Organiser (creator)": [(m as any)?.organizer_id],
      Chair: [(m as any)?.chair_id],
      "Minute taker": [sessionMinuteTaker || (m as any)?.default_minute_taker_id],
      "Everyone invited": invited,
    },
  };
}

export async function sendMeetEmail(
  event: MeetEventName,
  opts: {
    entityId: string;
    sessionId?: string | null;
    meetingId?: string | null;
    actorId?: string | null;
    recipients?: MeetRecipients;
    /** reminders: the rule timing this send is for ("BEFORE:1440") */
    trigger?: string;
    link?: string;
    data?: Record<string, string | number | null | undefined>;
  }
): Promise<void> {
  try {
    const std = opts.sessionId || opts.meetingId ? await standardPeople(opts.sessionId || undefined, opts.meetingId || undefined) : { roles: {}, organiserName: "" };
    const merged: Record<string, Set<string>> = {};
    for (const src of [std.roles, opts.recipients || {}]) {
      for (const [role, ids] of Object.entries(src)) {
        merged[role] ||= new Set();
        for (const id of ids || []) if (id) merged[role].add(id);
      }
    }
    const meet_recipients: Record<string, string[]> = {};
    for (const [role, set] of Object.entries(merged)) meet_recipients[role] = Array.from(set);

    await queueBusinessEvent("Meet", event, {
      entity_id: opts.entityId,
      triggering_user_id: opts.actorId || "",
      status: opts.trigger,
      link: opts.link,
      meet_recipients,
      organiser_name: std.organiserName,
      ...(opts.data || {}),
    });
  } catch (err) {
    console.error(`[Meet email] ${event} failed:`, err);
  }
}
