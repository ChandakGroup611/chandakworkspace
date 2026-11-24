"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { readMeetSmtp, asProvider, type MeetSmtp } from "@/lib/utils/meet-smtp";

/** Meet › Settings › Email sending: Chandak Meet's own mail server (SMTP). Admins only. */

async function admin() {
  const auth = await requireMeet("MEET_ADMIN", { requireAdmin: true });
  if (!(auth.isSuperAdmin || auth.isMeetAdmin)) throw new Error("Only a Meet admin can change the mail server.");
  return auth;
}

export interface MeetSmtpForm extends Omit<MeetSmtp, "password"> {
  hasPassword: boolean;
  workspaceServer: string | null;
}

export async function getMeetSmtpForm(): Promise<MeetSmtpForm> {
  await admin();
  const [c, { data: ws }] = await Promise.all([
    readMeetSmtp(),
    supabaseAdmin.from("email_providers").select("provider_name, config").eq("is_active", true).order("priority_level", { ascending: true }).limit(1),
  ]);
  const w = (ws || [])[0] as any;
  return {
    active: c?.active || false,
    host: c?.host || "",
    port: c?.port || 587,
    username: c?.username || "",
    sender_name: c?.sender_name || "Chandak Meet",
    from_email: c?.from_email || "",
    reply_to: c?.reply_to || "",
    hasPassword: !!c?.password,
    workspaceServer: w ? `${w.config?.host || w.config?.smtp_host || w.provider_name} · ${w.config?.from_email || w.config?.username || ""}` : null,
  };
}

const clean = (i: any, keepPassword: string) => ({
  active: !!i.active,
  host: String(i.host || "").trim().slice(0, 200),
  port: Math.round(Number(i.port) || 587),
  username: String(i.username || "").trim().slice(0, 200),
  password: String(i.password || "") || keepPassword,
  sender_name: String(i.sender_name || "").trim().slice(0, 120),
  from_email: String(i.from_email || "").trim().slice(0, 200),
  reply_to: String(i.reply_to || "").trim().slice(0, 200),
});

export async function saveMeetSmtp(input: Omit<MeetSmtp, "password"> & { password?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await admin();
    const prev = await readMeetSmtp();
    const v = clean(input, prev?.password || "");
    if (v.active) {
      if (!v.host || !v.port || !v.from_email) return { success: false, error: "Fill in the server, port and From address before switching it on." };
      if (!/^\S+@\S+\.\S+$/.test(v.from_email)) return { success: false, error: "The From address doesn't look like an email address." };
      if (v.username && !v.password) return { success: false, error: "Enter the password for this account." };
    }
    const { error } = await supabaseAdmin.from("core_module_settings").upsert(
      { module_key: "meet", key: "meet_smtp", value_json: v, updated_by: auth.userId, updated_at: new Date().toISOString() },
      { onConflict: "module_key,key" }
    );
    if (error) return { success: false, error: error.message };
    await supabaseAdmin.from("meet_activity_log").insert({ entity_type: "meeting", entity_id: auth.userId, action: "mail_server_changed", field: "meet_smtp", new_value: `${v.active ? "on" : "off"} · ${v.host}:${v.port} · ${v.from_email}`, user_id: auth.userId, channel: "web" });
    revalidatePath("/meet/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Couldn't save." };
  }
}

/** Connects and signs in to the server with the details on screen (nothing is sent). */
export async function testMeetSmtp(input: Omit<MeetSmtp, "password"> & { password?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    await admin();
    const prev = await readMeetSmtp();
    const v = clean(input, prev?.password || "");
    if (!v.host) return { success: false, error: "Enter the server." };
    const nodemailerRaw: any = await import("nodemailer");
    const nodemailer = nodemailerRaw.default || nodemailerRaw;
    const t = nodemailer.createTransport({
      host: v.host,
      port: v.port,
      secure: v.port === 465,
      ...(v.username ? { auth: { user: v.username, pass: v.password } } : {}),
      connectionTimeout: 15000,
      greetingTimeout: 15000,
    });
    await t.verify();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Couldn't connect: ${String(err?.message || err).slice(0, 200)}` };
  }
}

/** Sends a test email to the signed-in admin through the saved Meet server. */
export async function sendMeetSmtpTestEmail(): Promise<{ success: boolean; to?: string; error?: string }> {
  try {
    const auth = await admin();
    const c = await readMeetSmtp();
    if (!c?.host) return { success: false, error: "Save the mail server first." };
    const { data: me } = await supabaseAdmin.from("user_master").select("email, full_name").eq("id", auth.userId).maybeSingle();
    if (!me?.email) return { success: false, error: "Your account has no email address." };
    const { dispatchEmail } = await import("@/lib/actions/email-queue");
    await dispatchEmail(
      {
        recipient_email: me.email,
        subject: "[Test] Chandak Meet mail server",
        body_template: `<p>Dear ${me.full_name || ""},</p><p>This test email was sent by Chandak Meet through its own mail server (${c.host}). If you can read this, Meet emails will be delivered.</p><p>Chandak Meet</p>`,
      },
      asProvider(c)
    );
    return { success: true, to: me.email };
  } catch (err: any) {
    return { success: false, error: `Sending failed: ${String(err?.message || err).slice(0, 200)}` };
  }
}
