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
    let transportConfig: any = {
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.encryption_type === 'SSL/TLS',
    };

    if (config.smtp_username) {
      transportConfig.auth = {
        user: config.smtp_username,
        pass: config.smtp_password_encrypted,
      };
    } else {
      transportConfig.tls = { rejectUnauthorized: false };
    }

    const transporter = nodemailer.createTransport(transportConfig);
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

export async function deleteEmailProvider(id: string) {
  const { error } = await supabaseAdmin.from("email_providers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function previewEmailTemplate(moduleName: string, htmlBody: string) {
  let sampleData: any = {
    ticket_no: "TKT-SAMPLE",
    ticket_title: "Sample Ticket",
    task_name: "Sample Task",
    workspace_name: "Sample Workspace",
    assigned_user: "Sample User",
    creator_name: "Admin User",
    status: "In Progress",
    priority: "High",
    due_date: new Date().toLocaleDateString(),
    link: "#"
  };

  try {
    if (moduleName === "Task") {
      const { data } = await supabaseAdmin.from("tasks").select("id, title, status_master(name), priority_master(name), end_date, creator:user_master!tasks_created_by_fkey(full_name)").limit(1).single();
      if (data) {
        const d = data as any;
        sampleData = {
          ...sampleData,
          task_name: d.title,
          status: d.status_master?.name || (Array.isArray(d.status_master) && d.status_master[0]?.name) || "Open",
          priority: d.priority_master?.name || (Array.isArray(d.priority_master) && d.priority_master[0]?.name) || "Normal",
          creator_name: d.creator?.full_name || (Array.isArray(d.creator) && d.creator[0]?.full_name) || "Unknown",
          due_date: d.end_date || "N/A",
          link: `/tasks/${d.id}`
        };
      }
    } else if (moduleName === "Ticket") {
      const { data } = await supabaseAdmin.from("tickets").select("id, ticket_number, title, status_master(name), priority_master(name), creator:user_master!tickets_created_by_fkey(full_name)").limit(1).single();
      if (data) {
        const d = data as any;
        sampleData = {
          ...sampleData,
          ticket_no: d.ticket_number,
          ticket_title: d.title,
          status: d.status_master?.name || (Array.isArray(d.status_master) && d.status_master[0]?.name) || "Open",
          priority: d.priority_master?.name || (Array.isArray(d.priority_master) && d.priority_master[0]?.name) || "Normal",
          creator_name: d.creator?.full_name || (Array.isArray(d.creator) && d.creator[0]?.full_name) || "Unknown",
          link: `/tickets/${d.id}`
        };
      }
    } else if (moduleName === "Requirement") {
      const { data } = await supabaseAdmin.from("requirements").select("id, title, approval_status, creator:user_master!requirements_creator_id_fkey(full_name)").limit(1).single();
      if (data) {
        const d = data as any;
        sampleData = {
          ...sampleData,
          req_name: d.title,
          status: d.approval_status || "Pending",
          creator_name: d.creator?.full_name || (Array.isArray(d.creator) && d.creator[0]?.full_name) || "Unknown",
          link: `/requirements/${d.id}`
        };
      }
    }
  } catch (e) {
    console.error("Preview sample fetch failed", e);
  }

  let hydrated = htmlBody;
  const matches = hydrated.match(/{{(.*?)}}/g);
  if (matches) {
    matches.forEach(match => {
      const key = match.replace(/[{}]/g, "").trim();
      const value = sampleData[key] || "";
      hydrated = hydrated.replace(match, String(value));
    });
  }
  return hydrated;
}

export async function saveEmailProvider(payload: any) {
  const { data, error } = await supabaseAdmin.from("email_providers").insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return { success: true, data };
}

export async function updateEmailProvider(id: string, payload: any) {
  const { data, error } = await supabaseAdmin.from("email_providers").update(payload).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return { success: true, data };
}

export async function testProviderConnection(providerName: string, config: any) {
  try {
    if (providerName === "SMTP" || providerName === "Microsoft 365") {
      const nodemailer = (await import('nodemailer')).default;
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: Number(config.port),
        secure: Number(config.port) === 465,
        auth: {
          user: config.username,
          pass: config.password,
        },
        connectionTimeout: 10000, // 10 seconds
      });
      await transporter.verify();
      return { success: true, message: "Connection verified successfully!" };
    } else {
      return { success: false, message: `Test connection not supported for ${providerName} yet.` };
    }
  } catch (error: any) {
    console.error("Provider Test connection failed:", error);
    return { success: false, message: error.message || "Failed to connect to SMTP server." };
  }
}
