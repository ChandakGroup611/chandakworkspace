import { queueBusinessEvent } from "@/lib/actions/notification-engine";
import { MEET_EVENTS, MEET_RECIPIENTS } from "@/lib/utils/meet-email-config";

export { MEET_EVENTS, MEET_RECIPIENTS, MEET_MERGE_TAGS } from "@/lib/utils/meet-email-config";

/**
 * Every Chandak Meet email goes through here, and through the company's own notification engine:
 * Settings › Communication › Rules decides whether an event emails anyone and which roles,
 * Templates holds the subject and body the admin wrote, and Providers is our SMTP.
 * No rule or no template for an event means no email: there is no built-in text.
 */

export type MeetEvent = (typeof MEET_EVENTS)[number];
export type MeetRecipients = Partial<Record<(typeof MEET_RECIPIENTS)[number], (string | null | undefined)[]>>;

export async function sendMeetEmail(
  event: MeetEvent,
  opts: {
    entityId: string;
    actorId?: string | null;
    recipients: MeetRecipients;
    link?: string;
    data?: Record<string, string | number | null | undefined>;
  }
): Promise<void> {
  try {
    const meet_recipients: Record<string, string[]> = {};
    for (const [role, ids] of Object.entries(opts.recipients)) {
      meet_recipients[role] = Array.from(new Set((ids || []).filter(Boolean) as string[]));
    }
    await queueBusinessEvent("Meet", event, {
      entity_id: opts.entityId,
      triggering_user_id: opts.actorId || "",
      link: opts.link,
      meet_recipients,
      ...(opts.data || {}),
    });
  } catch (err) {
    console.error(`[Meet email] ${event} failed:`, err);
  }
}
