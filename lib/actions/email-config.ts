"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";

export async function fetchSystemEmailConfig() {
  const { data, error } = await supabaseAdmin
    .from("system_email_config")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching system email config:", error);
    return null;
  }
  return data || null;
}

export async function saveSystemEmailConfig(payload: any) {
  const { data: existing } = await supabaseAdmin.from("system_email_config").select("id").limit(1).single();

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from("system_email_config")
      .update({
        ...payload,
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id);
    if (error) throw new Error("Failed to update configuration.");
  } else {
    const { error } = await supabaseAdmin
      .from("system_email_config")
      .insert([payload]);
    if (error) throw new Error("Failed to insert configuration.");
  }

  return { success: true };
}

export async function testEmailConnection(config: any) {
  try {
    const nodemailer = (await import('nodemailer')).default;
    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.encryption_type === 'SSL/TLS',
      auth: {
        user: config.smtp_username,
        pass: config.smtp_password_encrypted,
      },
    });
    await transporter.verify();
    return { success: true, message: "Connection verified successfully!" };
  } catch (error: any) {
    console.error("Test connection failed:", error);
    return { success: false, message: error.message || "Failed to connect to SMTP server." };
  }
}

export async function fetchEventTriggerConfig() {
  const { data, error } = await supabaseAdmin
    .from("notification_event_config")
    .select("*")
    .order("module_code", { ascending: true });
  if (error) {
    console.error("Error fetching event config:", error);
    return [];
  }
  return data || [];
}

export async function updateEventTriggerConfig(id: string, updates: any) {
  const { error } = await supabaseAdmin
    .from("notification_event_config")
    .update(updates)
    .eq("id", id);
  if (error) throw new Error("Failed to update trigger config.");
  return { success: true };
}

export async function fetchSpecificEventConfig(moduleCode: string, eventCode: string) {
  const { data, error } = await supabaseAdmin
    .from("notification_event_config")
    .select("is_email_enabled, is_inapp_enabled, allowed_roles, allowed_statuses")
    .eq("module_code", moduleCode)
    .eq("event_code", eventCode)
    .single();
  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching specific event config:", error);
  }
  return data || null;
}
