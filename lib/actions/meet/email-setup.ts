"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import {
  MEET_EVENTS,
  MEET_EVENT_INFO,
  REMINDER_EVENTS,
  MEET_EMAIL_STARTERS,
  reminderTrigger,
  parseReminderTrigger,
  type MeetEventName,
} from "@/lib/utils/meet-email-config";

/**
 * Meet email editor: one screen per event with the template (subject + body) and who gets it.
 * Stored in the company's own tables, so Settings › Communication shows the same thing:
 *   email_templates      module "Meet", event → subject, html_body, is_active
 *   notification_rules   module "Meet", event → recipient_type (roles), status_trigger (reminder timing)
 */

export interface MeetEmailSetup {
  event: MeetEventName;
  when: string;
  roles: string[];
  isReminder: boolean;
  template: { id: string; subject: string; body: string; active: boolean } | null;
  rule: { id: string; recipients: string[]; timingMinutes: number | null; active: boolean } | null;
  sending: boolean;
}

const isEvent = (e: string): e is MeetEventName => (MEET_EVENTS as readonly string[]).includes(e);

export async function getMeetEmailSetup(): Promise<{ items: MeetEmailSetup[]; canEdit: boolean; smtpReady: boolean }> {
  const auth = await requireMeet("MEET_VIEW");
  const [tplRes, ruleRes, provRes] = await Promise.all([
    supabaseAdmin.from("email_templates").select("id, event, subject, html_body, is_active, updated_at").ilike("module", "meet"),
    supabaseAdmin.from("notification_rules").select("id, event, recipient_type, status_trigger, is_active, created_at").ilike("module", "meet"),
    supabaseAdmin.from("email_providers").select("id").eq("is_active", true).limit(1),
  ]);
  const tpls = (tplRes.data || []) as any[];
  const rules = (ruleRes.data || []) as any[];

  const items = MEET_EVENTS.map((event) => {
    const t = tpls.filter((x) => String(x.event).toLowerCase() === event.toLowerCase()).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))[0];
    const r = rules.filter((x) => String(x.event).toLowerCase() === event.toLowerCase()).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))[0];
    const template = t ? { id: t.id, subject: t.subject || "", body: t.html_body || "", active: t.is_active !== false } : null;
    const rule = r
      ? { id: r.id, recipients: Array.isArray(r.recipient_type) ? r.recipient_type : [], timingMinutes: parseReminderTrigger(r.status_trigger), active: r.is_active !== false }
      : null;
    const isReminder = REMINDER_EVENTS.includes(event);
    const sending =
      !!template?.active &&
      !!template.body.trim() &&
      !!rule?.active &&
      rule.recipients.length > 0 &&
      (!isReminder || !!rule.timingMinutes);
    return { event, when: MEET_EVENT_INFO[event].when, roles: [...MEET_EVENT_INFO[event].roles], isReminder, template, rule, sending };
  });

  return { items, canEdit: auth.isSuperAdmin || auth.isMeetAdmin, smtpReady: !!(provRes.data || []).length };
}

const toHtml = (body: string) => {
  const b = String(body || "");
  if (/<[a-z][\s\S]*>/i.test(b)) return b;
  return b
    .split(/\r?\n/)
    .map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))
    .join("<br>");
};

export async function saveMeetEmail(input: {
  event: string;
  subject: string;
  body: string;
  recipients: string[];
  timingMinutes?: number | null;
  active: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const auth = await requireMeet("MEET_ADMIN", { requireAdmin: true } as any);
  if (!(auth.isSuperAdmin || auth.isMeetAdmin)) return { success: false, error: "Only a Meet admin can change emails." };
  if (!isEvent(input.event)) return { success: false, error: "Unknown event." };
  const event = input.event;
  const subject = String(input.subject || "").trim().slice(0, 250);
  const body = String(input.body || "").trim();
  if (input.active && (!subject || !body)) return { success: false, error: "Write a subject and a message, or switch the email off." };
  const allowed = MEET_EVENT_INFO[event].roles as string[];
  const recipients = Array.from(new Set((input.recipients || []).filter((r) => allowed.includes(r))));
  if (input.active && recipients.length === 0) return { success: false, error: "Pick at least one person to send it to." };
  const isReminder = REMINDER_EVENTS.includes(event);
  const minutes = isReminder ? Math.round(Number(input.timingMinutes) || 0) : 0;
  if (isReminder && input.active && (minutes < 5 || minutes > 43200)) return { success: false, error: "Pick when the reminder should go out." };

  try {
    const now = new Date().toISOString();
    // Template (one per event)
    const { data: tpls } = await supabaseAdmin.from("email_templates").select("id").ilike("module", "meet").ilike("event", event);
    const tplPayload = { module: "Meet", event, template_name: `Meet · ${event}`, subject: subject || event, html_body: toHtml(body), is_active: !!input.active, updated_at: now };
    if (tpls && tpls.length) {
      const { error } = await supabaseAdmin.from("email_templates").update(tplPayload).eq("id", tpls[0].id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabaseAdmin.from("email_templates").insert(tplPayload);
      if (error) return { success: false, error: error.message };
    }

    // Who gets it (one rule per event)
    const { data: rules } = await supabaseAdmin.from("notification_rules").select("id").ilike("module", "meet").ilike("event", event).order("created_at", { ascending: true });
    const rulePayload = {
      module: "Meet",
      event,
      status_trigger: isReminder ? reminderTrigger(minutes || 1440) : "ANY",
      recipient_type: recipients,
      delivery_method: ["EMAIL"],
      is_active: !!input.active,
      updated_at: now,
    };
    if (rules && rules.length) {
      const { error } = await supabaseAdmin.from("notification_rules").update(rulePayload).eq("id", rules[0].id);
      if (error) return { success: false, error: error.message };
      // Extra rules for the same event would send twice: switch them off (kept, not deleted)
      if (rules.length > 1) await supabaseAdmin.from("notification_rules").update({ is_active: false, updated_at: now }).in("id", rules.slice(1).map((r: any) => r.id));
    } else {
      const { error } = await supabaseAdmin.from("notification_rules").insert(rulePayload);
      if (error) return { success: false, error: error.message };
    }

    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "meeting",
      entity_id: auth.userId,
      action: "email_setup_changed",
      field: event,
      new_value: `${input.active ? "on" : "off"} · ${recipients.join(", ")}${isReminder ? ` · ${minutes} min before` : ""}`,
      user_id: auth.userId,
      channel: "web",
    });
    revalidatePath("/meet/automations");
    revalidatePath("/meet/automations/emails");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Couldn't save." };
  }
}

const SAMPLE: Record<string, string> = {
  recipient_name: "Rohit Kale",
  meeting_title: "Weekly Sales Review",
  meeting_code: "MTG-0007",
  session_code: "MTG-0007/S-012",
  start_time: "Mon, 30 Nov 2026, 8:30 PM IST",
  room: "Board room 2",
  join_link: "https://teams.microsoft.com/…",
  link: "https://chandakgroup.tech/meet",
  organiser_name: "Avinash Pise",
  point_code: "PT-0142",
  point_title: "Close Indore distributor agreement",
  points_list: "PT-0142 Close Indore distributor agreement (due 28 Nov)",
  task_code: "TK-0311",
  task_title: "Share dealer-wise collection report",
  due_date: "28 Nov 2026",
  carry_count: "3",
  person_name: "Rohit Kale",
  reason: "On a site visit that day",
  minutes_text: "Dear all,<br><br>Please find below the minutes of Weekly Sales Review…<br><br>SUMMARY<br>…<br><br>DECISIONS<br>1. …<br><br>ACTION ITEMS<br>1. …",
};

/** Sends the template, filled with sample values, to the signed-in admin only. */
export async function sendMeetTestEmail(input: { subject: string; body: string }): Promise<{ success: boolean; to?: string; error?: string }> {
  const auth = await requireMeet("MEET_VIEW");
  if (!(auth.isSuperAdmin || auth.isMeetAdmin)) return { success: false, error: "Only a Meet admin can send tests." };
  const { data: me } = await supabaseAdmin.from("user_master").select("email, full_name").eq("id", auth.userId).maybeSingle();
  if (!me?.email) return { success: false, error: "Your account has no email address." };
  const fill = (t: string) => String(t || "").replace(/{{\s*([a-z_]+)\s*}}/gi, (_m, k) => (k === "recipient_name" ? me.full_name || SAMPLE.recipient_name : SAMPLE[k.toLowerCase()] ?? ""));
  const row = { recipient_email: me.email, subject: `[Test] ${fill(input.subject) || "Meet email"}`.slice(0, 250), body_template: toHtml(fill(input.body)) };
  const { sendMeetRows } = await import("@/lib/utils/meet-smtp");
  if (await sendMeetRows([row]).catch(() => false)) return { success: true, to: me.email };
  const { error } = await supabaseAdmin.from("email_queue").insert({ ...row, is_sent: false });
  if (error) return { success: false, error: error.message };
  import("@/lib/actions/email-queue").then((m) => m.processEmailQueueAsync().catch(() => null)).catch(() => null);
  return { success: true, to: me.email };
}


/**
 * Adds the suggested wording to every Meet email that hasn't been written yet. Each one is saved
 * switched OFF, so nothing is sent until the admin reviews it and turns it on. Emails already
 * written are never touched.
 */
export async function addSuggestedEmailDrafts(): Promise<{ success: boolean; added?: number; error?: string }> {
  const auth = await requireMeet("MEET_VIEW");
  if (!(auth.isSuperAdmin || auth.isMeetAdmin)) return { success: false, error: "Only a Meet admin can change emails." };
  try {
    const [{ data: tpls }, { data: rules }] = await Promise.all([
      supabaseAdmin.from("email_templates").select("id, event, html_body").ilike("module", "meet"),
      supabaseAdmin.from("notification_rules").select("id, event").ilike("module", "meet"),
    ]);
    const written = new Set((tpls || []).filter((t: any) => String(t.html_body || "").trim()).map((t: any) => String(t.event).toLowerCase()));
    const hasRule = new Set((rules || []).map((r: any) => String(r.event).toLowerCase()));
    const now = new Date().toISOString();
    let added = 0;
    for (const event of MEET_EVENTS) {
      if (written.has(event.toLowerCase())) continue;
      const st = MEET_EMAIL_STARTERS[event];
      const existing = (tpls || []).find((t: any) => String(t.event).toLowerCase() === event.toLowerCase());
      const tplPayload = { module: "Meet", event, template_name: `Meet · ${event}`, subject: st.subject, html_body: toHtml(st.body), is_active: false, updated_at: now };
      const { error: tErr } = existing
        ? await supabaseAdmin.from("email_templates").update(tplPayload).eq("id", (existing as any).id)
        : await supabaseAdmin.from("email_templates").insert(tplPayload);
      if (tErr) return { success: false, error: tErr.message };
      if (!hasRule.has(event.toLowerCase())) {
        const { error: rErr } = await supabaseAdmin.from("notification_rules").insert({
          module: "Meet",
          event,
          status_trigger: REMINDER_EVENTS.includes(event) ? reminderTrigger(st.timingMinutes || 1440) : "ANY",
          recipient_type: st.recipients,
          delivery_method: ["EMAIL"],
          is_active: false,
          updated_at: now,
        });
        if (rErr) return { success: false, error: rErr.message };
      }
      added++;
    }
    revalidatePath("/meet/automations");
    revalidatePath("/meet/automations/emails");
    return { success: true, added };
  } catch (err: any) {
    return { success: false, error: err?.message || "Couldn't add the suggested emails." };
  }
}
