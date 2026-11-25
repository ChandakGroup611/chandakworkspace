"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { processEmailQueueAsync } from "./email-queue";

// Email server settings hold mail-server passwords and can send mail as the company, so every
// read / change / test here is limited to Super Admin or people with SETTINGS_MANAGE (or EMAIL_CONFIG_MANAGE).
async function requireEmailAdmin() {
  const { getCachedUser } = await import("@/lib/auth/cached-user");
  const { user } = await getCachedUser();
  if (!user) throw new Error("Please sign in again.");
  const { hasPermission } = await import("@/lib/permissions");
  for (const code of ["SUPER_ADMIN", "SETTINGS_MANAGE", "EMAIL_CONFIG_MANAGE"]) {
    if (await hasPermission(user.id, code)) return user;
  }
  throw new Error("Unauthorized: only administrators can view or change email settings.");
}

export async function fetchSystemEmailConfig() {
  await requireEmailAdmin();
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
  if (!data) return null;
  return {
    ...data,
    hasPassword: Boolean(data.smtp_password_encrypted),
    smtp_password_encrypted: "", // Masked: never send plaintext credentials to client
  };
}

export async function saveSystemEmailConfig(payload: any) {
  await requireEmailAdmin();
  const { data: existing } = await supabaseAdmin
    .from("system_email_config")
    .select("id, smtp_password_encrypted")
    .limit(1)
    .single();

  const safePayload = { ...payload };
  if (!safePayload.smtp_password_encrypted && existing?.smtp_password_encrypted) {
    safePayload.smtp_password_encrypted = existing.smtp_password_encrypted;
  }

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from("system_email_config")
      .update(safePayload)
      .eq("id", existing.id);
    if (error) throw new Error("Failed to update configuration.");
  } else {
    const { error } = await supabaseAdmin
      .from("system_email_config")
      .insert([safePayload]);
    if (error) throw new Error("Failed to insert configuration.");
  }

  return { success: true };
}

export async function testEmailConnection(config: any) {
  await requireEmailAdmin();
  try {
    let resolvedConfig = { ...config };
    if (!resolvedConfig.smtp_password_encrypted) {
      const { data: existing } = await supabaseAdmin
        .from("system_email_config")
        .select("smtp_password_encrypted")
        .limit(1)
        .single();
      if (existing?.smtp_password_encrypted) {
        resolvedConfig.smtp_password_encrypted = existing.smtp_password_encrypted;
      }
    }

    const nodemailerRaw = await import('nodemailer');
    const nodemailer = nodemailerRaw.default || nodemailerRaw;
    let transportConfig: any = {
      host: resolvedConfig.smtp_host,
      port: resolvedConfig.smtp_port,
      secure: resolvedConfig.encryption_type === 'SSL/TLS',
    };

    if (resolvedConfig.smtp_username) {
      transportConfig.auth = {
        user: resolvedConfig.smtp_username,
        pass: resolvedConfig.smtp_password_encrypted,
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
  await requireEmailAdmin();
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
  await requireEmailAdmin();
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
  await requireEmailAdmin();
  const { error } = await supabaseAdmin.from("email_providers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function previewEmailTemplate(moduleName: string, htmlBody: string) {
  let sampleData: any = {
    ticket_no: "TKT-2026-09/0042",
    ticket_title: "Network Connectivity in Operations Wing",
    task_name: "Implement Biometric Vendor Integration",
    task_code: "TSK-2026-0042",
    workspace_name: "AI Adoption & Development",
    workspace_code: "SWS-2026-27/09/0004",
    sub_workspace_name: "AI Adoption & Development",
    parent_workspace: "Corporate IT & Technology",
    parent_workspace_name: "Corporate IT & Technology",
    req_code: "REQ-2026-0012",
    req_name: "Automated Vendor Invoicing Pipeline",
    assigned_user: "Anand Mohta",
    assigned_to: "Anand Mohta",
    creator_name: "Adil Kazi",
    workspace_owner: "Adil Kazi",
    owner_name: "Adil Kazi",
    description: "Enterprise digital transformation initiative streamlining cross-departmental operations and automation.",
    company_name: "Chandak Group",
    start_date: "2026-04-01",
    end_date: "2027-03-31",
    due_date: new Date().toLocaleDateString(),
    status: "In Progress",
    priority: "High",
    role: "Project Lead",
    remarks: "Milestone achieved according to standard compliance specifications.",
    remark: "Milestone achieved according to standard compliance specifications.",
    task_type: "Task",
    parent_task_name: "Primary Architecture Setup",
    type: "Workspace",
    recipient_name: "Team Member",
    link: "https://chandakgroup.tech/workspaces"
  };

  try {
    if (moduleName === "Task") {
      const { data } = await supabaseAdmin
        .from("tasks")
        .select("id, subject, task_code, description, start_date, end_date, created_by, assigned_to, parent_task_id, status_master(status_name), priority_master(priority_name), workspace:workspaces(workspace_name, workspace_code), parent:tasks!parent_task_id(subject)")
        .limit(1)
        .maybeSingle();

      if (data) {
        const d = data as any;
        const statusName = d.status_master?.status_name || (Array.isArray(d.status_master) && d.status_master[0]?.status_name) || "In Progress";
        const priorityName = d.priority_master?.priority_name || (Array.isArray(d.priority_master) && d.priority_master[0]?.priority_name) || "High";
        
        let creatorName = "Adil Kazi";
        let assigneeName = "Anand Mohta";
        const userIds = [d.created_by, d.assigned_to].filter(Boolean);
        if (userIds.length > 0) {
          const { data: uList } = await supabaseAdmin.from("user_master").select("id, full_name").in("id", userIds);
          const uMap = new Map((uList || []).map((u: any) => [u.id, u.full_name]));
          if (d.created_by && uMap.has(d.created_by)) creatorName = uMap.get(d.created_by);
          if (d.assigned_to && uMap.has(d.assigned_to)) assigneeName = uMap.get(d.assigned_to);
        }

        const wsName = d.workspace?.workspace_name || (Array.isArray(d.workspace) && d.workspace[0]?.workspace_name) || sampleData.workspace_name;
        const wsCode = d.workspace?.workspace_code || (Array.isArray(d.workspace) && d.workspace[0]?.workspace_code) || sampleData.workspace_code;
        const parentTaskName = d.parent?.subject || (Array.isArray(d.parent) && d.parent[0]?.subject) || "Primary Architecture Setup";

        sampleData = {
          ...sampleData,
          task_name: d.subject || sampleData.task_name,
          task_code: d.task_code || sampleData.task_code,
          description: d.description || sampleData.description,
          status: statusName,
          priority: priorityName,
          creator_name: creatorName,
          assigned_user: assigneeName,
          assigned_to: assigneeName,
          workspace_name: wsName,
          workspace_code: wsCode,
          start_date: d.start_date ? new Date(d.start_date).toLocaleDateString() : sampleData.start_date,
          end_date: d.end_date ? new Date(d.end_date).toLocaleDateString() : sampleData.end_date,
          due_date: d.end_date ? new Date(d.end_date).toLocaleDateString() : sampleData.due_date,
          task_type: d.parent_task_id ? "Subtask" : "Task",
          parent_task_name: parentTaskName,
          link: `/tasks/${d.id}`
        };
      }
    } else if (moduleName === "Ticket") {
      const { data } = await supabaseAdmin
        .from("tickets")
        .select("id, code, title, description, creator_id, status_master(status_name), priority_master(priority_name)")
        .limit(1)
        .maybeSingle();

      if (data) {
        const d = data as any;
        const statusName = d.status_master?.status_name || (Array.isArray(d.status_master) && d.status_master[0]?.status_name) || "Open";
        const priorityName = d.priority_master?.priority_name || (Array.isArray(d.priority_master) && d.priority_master[0]?.priority_name) || "Normal";
        let creatorName = "Adil Kazi";
        if (d.creator_id) {
          const { data: u } = await supabaseAdmin.from("user_master").select("full_name").eq("id", d.creator_id).maybeSingle();
          if (u?.full_name) creatorName = u.full_name;
        }

        sampleData = {
          ...sampleData,
          ticket_no: d.code || sampleData.ticket_no,
          ticket_title: d.title || sampleData.ticket_title,
          description: d.description || sampleData.description,
          status: statusName,
          priority: priorityName,
          creator_name: creatorName,
          link: `/tickets/${d.id}`
        };
      }
    } else if (moduleName === "Requirement") {
      const { data } = await supabaseAdmin
        .from("requirements")
        .select("id, title, code, requirement_details, approval_status, due_date, creator_id")
        .limit(1)
        .maybeSingle();

      if (data) {
        const d = data as any;
        let creatorName = "Adil Kazi";
        if (d.creator_id) {
          const { data: u } = await supabaseAdmin.from("user_master").select("full_name").eq("id", d.creator_id).maybeSingle();
          if (u?.full_name) creatorName = u.full_name;
        }

        sampleData = {
          ...sampleData,
          req_code: d.code || sampleData.req_code,
          req_name: d.title || sampleData.req_name,
          description: d.requirement_details || sampleData.description,
          status: d.approval_status || "Pending Approval",
          approval_status: d.approval_status || "Pending Approval",
          due_date: d.due_date ? new Date(d.due_date).toLocaleDateString() : sampleData.due_date,
          creator_name: creatorName,
          link: `/requirements/${d.id}`
        };
      }
    } else if (moduleName === "Workspace") {
      const { data } = await supabaseAdmin
        .from("workspaces")
        .select(`
          id, 
          workspace_name, 
          workspace_code, 
          description, 
          start_date, 
          end_date, 
          workspace_owner_id,
          parent_workspace_id,
          status:status_master!workspaces_status_id_fkey(status_name), 
          company:company_master(company_name),
          parent:workspaces!parent_workspace_id(workspace_name)
        `)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const d = data as any;
        const statusName = d.status?.status_name || (Array.isArray(d.status) && d.status[0]?.status_name) || "Active";
        const companyName = d.company?.company_name || (Array.isArray(d.company) && d.company[0]?.company_name) || "Chandak Group";
        const parentName = d.parent?.workspace_name || (Array.isArray(d.parent) && d.parent[0]?.workspace_name) || "Corporate Operations";
        let ownerName = "Adil Kazi";
        if (d.workspace_owner_id) {
          const { data: u } = await supabaseAdmin.from("user_master").select("full_name").eq("id", d.workspace_owner_id).maybeSingle();
          if (u?.full_name) ownerName = u.full_name;
        }

        sampleData = {
          ...sampleData,
          workspace_name: d.workspace_name || sampleData.workspace_name,
          workspace_code: d.workspace_code || sampleData.workspace_code,
          description: d.description || sampleData.description,
          status: statusName,
          company_name: companyName,
          start_date: d.start_date ? new Date(d.start_date).toLocaleDateString() : sampleData.start_date,
          end_date: d.end_date ? new Date(d.end_date).toLocaleDateString() : sampleData.end_date,
          due_date: d.end_date ? new Date(d.end_date).toLocaleDateString() : sampleData.due_date,
          workspace_owner: ownerName,
          owner_name: ownerName,
          assigned_user: ownerName,
          creator_name: ownerName,
          parent_workspace: parentName,
          parent_workspace_name: parentName,
          type: d.parent_workspace_id ? "Sub-Workspace" : "Workspace",
          link: `/workspaces`
        };
      }
    } else if (moduleName === "Vehicle" || moduleName === "Vehicle (FleetDesk)") {
      const { data } = await supabaseAdmin
        .from("vehicles")
        .select("id, registration_number, make, model, insurance_vendor, insurance_policy_number, insurance_expiry_date, puc_expiry_date, fitness_expiry_date, rto_office, odometer_km")
        .limit(1)
        .single();
      
      sampleData = {
        ...sampleData,
        registration_number: data?.registration_number || "MH-02-FE-4281",
        vehicle_name: data?.make ? `${data.make} ${data.model}` : "Toyota Innova Crysta",
        doc_type: "Motor Insurance Policy",
        expiry_date: data?.insurance_expiry_date || "2026-11-15",
        days_remaining: "28 Days Left",
        insurance_vendor: data?.insurance_vendor || "HDFC ERGO General Insurance",
        insurance_policy_number: data?.insurance_policy_number || "POL-2026-94821",
        puc_certificate_number: "PUC-MH-2026-8812",
        driver_name: "Ramesh Sharma",
        driver_phone: "+91 98201 44892",
        rto_office: data?.rto_office || "MH-02 Mumbai West RTO",
        odometer_km: data?.odometer_km ? `${data.odometer_km} km` : "24,500 km",
        service_type: "Scheduled 20,000 km Major Service",
        service_due_date: "2026-11-01",
        status: "EXPIRING_SOON",
        link: `/vehicle`
      };
    }
  } catch (e) {
    console.error("Preview sample fetch failed", e);
  }

  let hydrated = htmlBody || "";
  const matches = hydrated.match(/{{(.*?)}}/g);
  if (matches) {
    matches.forEach(match => {
      const key = match.replace(/[{}]/g, "").trim();
      let value = sampleData[key];
      // Friendly alias resolution
      if (value === undefined || value === null) {
        if (key === 'workspace_owner') value = sampleData.owner_name || sampleData.creator_name;
        else if (key === 'owner_name') value = sampleData.workspace_owner || sampleData.creator_name;
        else if (key === 'assigned_user') value = sampleData.assigned_to;
        else if (key === 'due_date') value = sampleData.end_date;
        else if (key === 'end_date') value = sampleData.due_date;
        else if (key === 'parent_workspace') value = sampleData.parent_workspace_name;
        else if (key === 'parent_workspace_name') value = sampleData.parent_workspace;
        else {
          // If not in sampleData, display clean sample representation instead of blank
          const words = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
          value = `[${words}]`;
        }
      }
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
  await requireEmailAdmin();
  const { data, error } = await supabaseAdmin
    .from("email_providers")
    .select("*")
    .order("priority_level", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching email providers:", error);
    return [];
  }
  return (data || []).map((prov) => {
    const rawConfig = prov.config || {};
    return {
      ...prov,
      config: {
        ...rawConfig,
        hasPassword: Boolean(rawConfig.password),
        hasApiKey: Boolean(rawConfig.api_key),
        password: "", // REDACTED: Never expose to browser
        api_key: "",  // REDACTED: Never expose to browser
      },
    };
  });
}

export async function saveEmailProvider(payload: any) {
  await requireEmailAdmin();
  const { data, error } = await supabaseAdmin.from("email_providers").insert([payload]).select().single();
  if (error) throw new Error(error.message);
  
  // Try to clear backlog if there was any
  processEmailQueueAsync().catch(console.error);
  
  return { success: true, data };
}

export async function updateEmailProvider(id: string, payload: any) {
  await requireEmailAdmin();

  // If password or api_key is blank, retain the existing values from the database
  const { data: existing } = await supabaseAdmin
    .from("email_providers")
    .select("config")
    .eq("id", id)
    .single();

  const mergedConfig = { ...(payload.config || {}) };
  if (existing?.config) {
    if (!mergedConfig.password && existing.config.password) {
      mergedConfig.password = existing.config.password;
    }
    if (!mergedConfig.api_key && existing.config.api_key) {
      mergedConfig.api_key = existing.config.api_key;
    }
  }

  const safePayload = {
    ...payload,
    config: mergedConfig,
  };

  const { data, error } = await supabaseAdmin.from("email_providers").update(safePayload).eq("id", id).select().single();
  if (error) throw new Error(error.message);

  // Try to clear backlog if there was any
  processEmailQueueAsync().catch(console.error);

  return { success: true, data };
}

export async function testProviderConnection(providerName: string, config: any, providerId?: string) {
  await requireEmailAdmin();
  try {
    let resolvedConfig = { ...config };
    // If password is blank but we have an existing provider ID, load stored password from database
    if (!resolvedConfig.password && providerId && !providerId.startsWith("temp_")) {
      const { data: existing } = await supabaseAdmin
        .from("email_providers")
        .select("config")
        .eq("id", providerId)
        .single();
      if (existing?.config?.password) {
        resolvedConfig.password = existing.config.password;
      }
    }

    if (providerName === "SMTP" || providerName === "Microsoft 365") {
      if (!resolvedConfig.password) {
        return { success: false, message: "Password is required for SMTP connection test." };
      }
      const nodemailerRaw = await import('nodemailer');
      const nodemailer = nodemailerRaw.default || nodemailerRaw;
      const transporter = nodemailer.createTransport({
        host: resolvedConfig.host,
        port: Number(resolvedConfig.port),
        secure: Number(resolvedConfig.port) === 465,
        auth: {
          user: resolvedConfig.username,
          pass: resolvedConfig.password,
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
