import { dispatchNotification } from "@/lib/actions/notifications";

/**
 * In-app (bell) notification for Chandak Meet. Never sends email: Meet emails go only through
 * the templates an admin writes in Automations › Emails.
 */
export async function notifyMeetInApp(userIds: (string | null | undefined)[], title: string, message: string, link: string, skipUserId?: string | null) {
  const ids = Array.from(new Set(userIds.filter((x): x is string => !!x && x !== skipUserId)));
  await Promise.all(
    ids.map((uid) => dispatchNotification(uid, title, message, link, undefined, undefined, { _disableEmail: true }).catch(() => null))
  );
}
