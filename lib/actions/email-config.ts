"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { processEmailQueueAsync } from "./email-queue";

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
    const nodemailerRaw = await import('nodemailer');
    const nodemailer = nodemailerRaw.default || nodemailerRaw;
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
    .ilike("module_code", moduleCode)
    .ilike("event_code", eventCode)
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
    ticket_no: "TKT-2026-09/0042",
    ticket_title: "Network Connectivity in Operations Wing",
    task_name: "Implement Biometric Vendor Integration",
    workspace_name: "AI Adoption & Development",
    workspace_code: "SWS-2026-27/09/0004",
    req_code: "REQ-2026-0012",
    req_name: "Automated Vendor Invoicing Pipeline",
    assigned_user: "Anand Mohta",
    creator_name: "Adil Kazi",
    status: "In Progress",
    priority: "High",
    due_date: new Date().toLocaleDateString(),
    link: "https://chandakgroup.tech/workspaces"
  };

  try {
    if (moduleName === "Task") {
      const { data } = await supabaseAdmin.from("tasks").select("id, title, status_master(name), priority_master(name), end_date, creator:user_master!tasks_created_by_fkey(full_name)").limit(1).single();
      if (data) {
        const d = data as any;
        sampleData = {
          ...sampleData,
          task_name: d.title || sampleData.task_name,
          status: d.status_master?.name || (Array.isArray(d.status_master) && d.status_master[0]?.name) || "In Progress",
          priority: d.priority_master?.name || (Array.isArray(d.priority_master) && d.priority_master[0]?.name) || "High",
          creator_name: d.creator?.full_name || (Array.isArray(d.creator) && d.creator[0]?.full_name) || "Adil Kazi",
          due_date: d.end_date || sampleData.due_date,
          link: `/tasks/${d.id}`
        };
      }
    } else if (moduleName === "Ticket") {
      const { data } = await supabaseAdmin.from("tickets").select("id, ticket_number, title, status_master(name), priority_master(name), creator:user_master!tickets_created_by_fkey(full_name)").limit(1).single();
      if (data) {
        const d = data as any;
        sampleData = {
          ...sampleData,
          ticket_no: d.ticket_number || sampleData.ticket_no,
          ticket_title: d.title || sampleData.ticket_title,
          status: d.status_master?.name || (Array.isArray(d.status_master) && d.status_master[0]?.name) || "Open",
          priority: d.priority_master?.name || (Array.isArray(d.priority_master) && d.priority_master[0]?.name) || "Normal",
          creator_name: d.creator?.full_name || (Array.isArray(d.creator) && d.creator[0]?.full_name) || "Adil Kazi",
          link: `/tickets/${d.id}`
        };
      }
    } else if (moduleName === "Requirement") {
      const { data } = await supabaseAdmin.from("requirements").select("id, title, code, approval_status, creator:user_master!requirements_creator_id_fkey(full_name)").limit(1).single();
      if (data) {
        const d = data as any;
        sampleData = {
          ...sampleData,
          req_code: d.code || sampleData.req_code,
          req_name: d.title || sampleData.req_name,
          status: d.approval_status || "Pending Approval",
          creator_name: d.creator?.full_name || (Array.isArray(d.creator) && d.creator[0]?.full_name) || "Adil Kazi",
          link: `/requirements/${d.id}`
        };
      }
    } else if (moduleName === "Workspace") {
      const { data } = await supabaseAdmin.from("workspaces").select("id, workspace_name, workspace_code").limit(1).single();
      if (data) {
        sampleData = {
          ...sampleData,
          workspace_name: data.workspace_name || sampleData.workspace_name,
          workspace_code: data.workspace_code || sampleData.workspace_code,
          link: `/workspaces`
        };
      }
    }
  } catch (e) {
    console.error("Preview sample fetch failed", e);
  }

  let hydrated = htmlBody || "";
  const matches = hydrated.match(/{{(.*?)}}/g);
  if (matches) {
    matches.forEach(match => {
      const key = match.replace(/[{}]/g, "").trim();
      const value = sampleData[key] || "";
      hydrated = hydrated.replace(match, String(value));
    });
  }

  // If the template content doesn't contain HTML, format it using standard card renderer
  if (!hydrated.includes('<div') && !hydrated.includes('<p') && !hydrated.includes('<table')) {
    const { convertPlainTextToHtmlCard } = await import('@/lib/email/email-renderer');
    hydrated = convertPlainTextToHtmlCard({
      title: `${moduleName} Notification Preview`,
      text: hydrated
    });
  }

  return hydrated;
}

export async function fetchEmailProviders() {
  const { data, error } = await supabaseAdmin
    .from("email_providers")
    .select("*")
    .order("priority_level", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching email providers:", error);
    return [];
  }
  return data || [];
}

export async function saveEmailProvider(payload: any) {
  const { data, error } = await supabaseAdmin.from("email_providers").insert([payload]).select().single();
  if (error) throw new Error(error.message);
  
  // Try to clear backlog if there was any
  processEmailQueueAsync().catch(console.error);
  
  return { success: true, data };
}

export async function updateEmailProvider(id: string, payload: any) {
  const { data, error } = await supabaseAdmin.from("email_providers").update(payload).eq("id", id).select().single();
  if (error) throw new Error(error.message);

  // Try to clear backlog if there was any
  processEmailQueueAsync().catch(console.error);

  return { success: true, data };
}

export async function testProviderConnection(providerName: string, config: any) {
  try {
    if (providerName === "SMTP" || providerName === "Microsoft 365") {
      const nodemailerRaw = await import('nodemailer');
      const nodemailer = nodemailerRaw.default || nodemailerRaw;
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
