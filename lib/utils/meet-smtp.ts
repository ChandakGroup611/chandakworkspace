import { supabaseAdmin } from "@/lib/supabase/service_role";

/**
 * Chandak Meet's own outgoing mail server (Meet › Settings › Email sending).
 * Kept in core_module_settings meet/"meet_smtp". When it's switched on, Meet emails are sent
 * through it straight away; if it fails (or is off), they go through the Workspace mail server
 * queue as before, with its retries. Workspace emails never use this server.
 */

export interface MeetSmtp {
  active: boolean;
  host: string;
  port: number;
  username: string;
  password: string;
  sender_name: string;
  from_email: string;
  reply_to: string;
}

export async function readMeetSmtp(): Promise<MeetSmtp | null> {
  const { data } = await supabaseAdmin.from("core_module_settings").select("value_json").eq("module_key", "meet").eq("key", "meet_smtp").maybeSingle();
  const v = data?.value_json as any;
  if (!v || !v.host) return null;
  return {
    active: !!v.active,
    host: String(v.host || ""),
    port: Number(v.port) || 587,
    username: String(v.username || ""),
    password: String(v.password || ""),
    sender_name: String(v.sender_name || ""),
    from_email: String(v.from_email || ""),
    reply_to: String(v.reply_to || ""),
  };
}

export function asProvider(c: MeetSmtp) {
  return {
    id: null,
    provider_name: "SMTP",
    config: { host: c.host, port: c.port, username: c.username, password: c.password, sender_name: c.sender_name, from_email: c.from_email, reply_to: c.reply_to || c.from_email },
  };
}

/**
 * Queue rows for Meet and send them through Meet's server now. Returns false if Meet's server is
 * off or the rows couldn't be queued this way, so the caller queues them the normal way.
 */
export async function sendMeetRows(rows: { recipient_email: string; subject: string; body_template: string }[]): Promise<boolean> {
  const c = await readMeetSmtp();
  if (!c?.active || !c.host || !rows.length) return false;
  // Held out of the Workspace queue (is_sent + SENDING) while Meet's server sends them
  const { data: inserted, error } = await supabaseAdmin
    .from("email_queue")
    .insert(rows.map((r) => ({ ...r, is_sent: true, status: "SENDING" })))
    .select("id, recipient_email, subject, body_template");
  if (error || !inserted) return false;
  const { dispatchEmail } = await import("@/lib/actions/email-queue");
  let failed = 0;
  for (const item of inserted as any[]) {
    try {
      await dispatchEmail(item, asProvider(c));
      await supabaseAdmin.from("email_queue").update({ status: "COMPLETED", sent_at: new Date().toISOString(), processed_at: new Date().toISOString() }).eq("id", item.id);
      await supabaseAdmin.from("email_delivery_logs").insert({ queue_id: item.id, recipient_email: item.recipient_email, status: "DELIVERED" });
    } catch (err: any) {
      failed++;
      // Hand it to the Workspace queue, which retries with the Workspace mail server
      await supabaseAdmin
        .from("email_queue")
        .update({ is_sent: false, status: "RETRY", next_retry_at: new Date().toISOString(), error_message: `Meet mail server: ${String(err?.message || err).slice(0, 300)}` })
        .eq("id", item.id);
    }
  }
  if (failed) import("@/lib/actions/email-queue").then((m) => m.processEmailQueueAsync().catch(() => null)).catch(() => null);
  return true;
}
