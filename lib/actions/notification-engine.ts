import { createClient } from "@supabase/supabase-js";

// Use a Service Role client to bypass RLS when resolving recipients and queueing emails internally
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

type NotificationPayload = {
  entity_id: string;
  triggering_user_id: string;
  status?: string;
  [key: string]: any; // Additional data for merge tags
};

export async function queueBusinessEvent(moduleName: string, eventName: string, payload: NotificationPayload) {
  try {
    // 1. Fetch active rules for this event
    const { data: rules } = await supabaseAdmin
      .from("notification_rules")
      .select("*")
      .eq("module", moduleName)
      .eq("event", eventName)
      .eq("is_active", true);

    if (!rules || rules.length === 0) return;

    // Filter rules by status if applicable
    const matchedRules = rules.filter(r => 
      !r.status_trigger || r.status_trigger === "ANY" || r.status_trigger === payload.status
    );

    if (matchedRules.length === 0) return;

    // 2. Fetch the active template for this event
    const { data: templates } = await supabaseAdmin
      .from("email_templates")
      .select("*")
      .eq("module", moduleName)
      .eq("event", eventName)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!templates || templates.length === 0) {
      console.warn(`[NotificationEngine] No active template found for ${moduleName} - ${eventName}`);
      return;
    }
    
    const template = templates[0];

    // 3. Resolve all recipients across all matched rules
    const recipientUserIds = new Set<string>();
    
    for (const rule of matchedRules) {
      const types = rule.recipient_type as string[];
      for (const type of types) {
        const ids = await resolveRecipientType(type, moduleName, payload);
        ids.forEach(id => recipientUserIds.add(id));
      }
    }

    // Don't send to the person who triggered the event (unless explicitly debugging)
    recipientUserIds.delete(payload.triggering_user_id);

    if (recipientUserIds.size === 0) return;

    // 4. Resolve exact email addresses
    const { data: users } = await supabaseAdmin
      .from("user_master")
      .select("id, email, full_name")
      .in("id", Array.from(recipientUserIds));

    if (!users || users.length === 0) return;

    let creatorName = "System";
    if (payload.triggering_user_id) {
       const { data: creator } = await supabaseAdmin.from("user_master").select("full_name").eq("id", payload.triggering_user_id).maybeSingle();
       if (creator) creatorName = creator.full_name || "System";
    }

    let finalCreatorName = creatorName;
    if (payload.creator_name && payload.creator_name !== "System") {
      finalCreatorName = payload.creator_name;
    }

    // 5. Hydrate Templates and Queue per Recipient with Secure Direct Activity Links
    const { createDirectActivityUrl, transformEmailContentLinks } = await import('@/lib/auth/direct-access');
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chandakgroup.tech";

    let autoHydratedPayload = await autoHydratePayload(payload);

    const validUsers = users.filter(u => u.email && u.email.trim());
    if (validUsers.length === 0) return;

    const queueInserts = validUsers.map(user => {
      const userDirectLink = createDirectActivityUrl(
        user.id,
        user.email,
        payload.link || `/${moduleName.toLowerCase()}s`,
        baseUrl
      );

      const userHydratedPayload = {
        ...autoHydratedPayload,
        link: userDirectLink,
        recipient_name: user.full_name || "Team",
        creator_name: finalCreatorName
      };

      const subject = template.subject ? hydrateTemplate(template.subject, userHydratedPayload) : "System Notification";
      let htmlBody = template.html_body ? hydrateTemplate(template.html_body, userHydratedPayload) : null;
      let bodyTemplate = template.body_template ? hydrateTemplate(template.body_template, userHydratedPayload) : null;

      let finalBody = htmlBody || bodyTemplate || `Notification: ${moduleName} - ${eventName}\n\nLink: ${userDirectLink}`;
      finalBody = transformEmailContentLinks(finalBody, user.id, user.email, baseUrl);

      return {
        recipient_email: user.email,
        subject: subject,
        body_template: finalBody,
        is_sent: false
      };
    });

    // 6. Async Batch Insert into Queue
    const { error } = await supabaseAdmin.from("email_queue").insert(queueInserts);
    
    if (error) {
      console.error("[NotificationEngine] Failed to insert into queue", error);
    } else {
      // Trigger background processor asynchronously (fire and forget)
      triggerBackgroundProcessor();
    }

  } catch (err) {
    console.error("[NotificationEngine] Critical Error", err);
  }
}

// Fire and forget function to kick off the background queue processor
function triggerBackgroundProcessor() {
  try {
    import('./email-queue').then(module => {
      module.processEmailQueueAsync().catch((e) => console.error("Instant cron trigger failed:", e));
    });
  } catch (e) {
    // Ignore dynamic import errors
  }
}

// ---------------------------------------------------------------------------
// HYDRATION ENGINE
// ---------------------------------------------------------------------------
async function autoHydratePayload(payload: any) {
  const hydrated = { ...payload };
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Task-specific auto-enrichment
  if (payload.entity_id && (!hydrated.task_name || !hydrated.ticket_no)) {
    try {
      const { data: task } = await supabaseAdmin
        .from('tasks')
        .select('subject, priority_id, status_id, end_date, assigned_to, creator_id, workspace_id')
        .eq('id', payload.entity_id)
        .maybeSingle();

      if (task) {
        if (!hydrated.task_name) hydrated.task_name = task.subject;
        if (!hydrated.priority && task.priority_id) hydrated.priority = task.priority_id;
        if (!hydrated.status && task.status_id) hydrated.status = task.status_id;
        if (!hydrated.due_date && task.end_date) hydrated.due_date = task.end_date;
        if (!hydrated.assigned_to && task.assigned_to) hydrated.assigned_to = task.assigned_to;
        if (!hydrated.workspace_id && task.workspace_id) hydrated.workspace_id = task.workspace_id;

        // Try to find if this task is linked to a requirement or ticket
        const { data: reqTask } = await supabaseAdmin
          .from('requirement_tasks')
          .select('requirement_id, requirements(id, code, title, ticket_id)')
          .eq('task_id', payload.entity_id)
          .maybeSingle();

        if (reqTask?.requirements) {
          const req = reqTask.requirements as any;
          if (req.ticket_id) {
            const { data: ticket } = await supabaseAdmin
              .from('tickets')
              .select('code')
              .eq('id', req.ticket_id)
              .maybeSingle();
            if (ticket?.code) hydrated.ticket_no = ticket.code;
          } else if (req.code) {
            hydrated.ticket_no = req.code;
          }
        }
      }
    } catch (e) {
      console.error('[NotificationEngine] Task auto-enrichment failed', e);
    }
  }

  const fieldMappings: Record<string, { table: string, column: string }> = {
    'assigned_to': { table: 'user_master', column: 'full_name' },
    'requester_id': { table: 'user_master', column: 'full_name' },
    'created_by': { table: 'user_master', column: 'full_name' },
    'triggering_user_id': { table: 'user_master', column: 'full_name' },
    'priority': { table: 'priority_master', column: 'priority_name' },
    'priority_id': { table: 'priority_master', column: 'priority_name' },
    'department': { table: 'departments', column: 'name' },
    'department_id': { table: 'departments', column: 'name' },
    'category': { table: 'ticket_categories', column: 'name' },
    'category_id': { table: 'ticket_categories', column: 'name' },
    'subcategory': { table: 'ticket_subcategories', column: 'name' },
    'subcategory_id': { table: 'ticket_subcategories', column: 'name' },
    'workspace_id': { table: 'workspaces', column: 'name' },
    'status': { table: 'status_master', column: 'status_name' },
    'status_id': { table: 'status_master', column: 'status_name' }
  };

  for (const [key, value] of Object.entries(hydrated)) {
    if (typeof value === 'string' && uuidRegex.test(value)) {
       const mapping = fieldMappings[key];
       if (mapping) {
          try {
             const { data } = await supabaseAdmin.from(mapping.table).select(mapping.column).eq('id', value).maybeSingle();
             if (data && (data as any)[mapping.column]) {
                hydrated[key] = (data as any)[mapping.column];
             }
          } catch (e) {
             console.error(`[NotificationEngine] Failed to hydrate ${key}`, e);
          }
       }
    }
  }

  // Set aliases for common merge tags
  if (hydrated.assigned_to && !hydrated.assigned_user) {
    hydrated.assigned_user = hydrated.assigned_to;
  }
  if (hydrated.workspace_id && !hydrated.workspace_name) {
    hydrated.workspace_name = hydrated.workspace_id;
  }

  return hydrated;
}

function hydrateTemplate(text: string, data: any): string {
  if (!text) return "";
  let hydrated = text;
  // Match {{key}} pattern
  const matches = hydrated.match(/{{(.*?)}}/g);
  if (matches) {
    matches.forEach(match => {
      const key = match.replace(/[{}]/g, "").trim();
      const value = data[key] !== undefined && data[key] !== null ? data[key] : "";
      hydrated = hydrated.replace(match, String(value));
    });
  }
  return hydrated;
}

// ---------------------------------------------------------------------------
// RECIPIENT RESOLUTION ENGINE
// ---------------------------------------------------------------------------
async function resolveRecipientType(type: string, moduleName: string, payload: any): Promise<string[]> {
  const ids: string[] = [];

  switch (type) {
    case "Creator":
      if (payload.created_by) {
        ids.push(payload.created_by);
      } else if (payload.creator_id) {
        ids.push(payload.creator_id);
      } else if (payload.entity_id) {
        if (moduleName === "Task") {
          const { data } = await supabaseAdmin.from("tasks").select("created_by, creator_id").eq("id", payload.entity_id).maybeSingle();
          if (data?.created_by) ids.push(data.created_by);
          else if (data?.creator_id) ids.push(data.creator_id);
        } else if (moduleName === "Ticket") {
          const { data } = await supabaseAdmin.from("tickets").select("created_by, creator_id").eq("id", payload.entity_id).maybeSingle();
          if (data?.created_by) ids.push(data.created_by);
          else if (data?.creator_id) ids.push(data.creator_id);
        } else if (moduleName === "Requirement") {
          const { data } = await supabaseAdmin.from("requirements").select("created_by, creator_id").eq("id", payload.entity_id).maybeSingle();
          if (data?.created_by) ids.push(data.created_by);
          else if (data?.creator_id) ids.push(data.creator_id);
        } else if (moduleName === "Workspace") {
          const { data } = await supabaseAdmin.from("workspaces").select("created_by, owner_id").eq("id", payload.entity_id).maybeSingle();
          if (data?.created_by) ids.push(data.created_by);
        }
      }
      break;
      
    case "Assigned User":
      if (payload.assigned_to) {
        ids.push(payload.assigned_to);
      } else if (payload.entity_id) {
        if (moduleName === "Task") {
          const { data } = await supabaseAdmin.from("tasks").select("assigned_to").eq("id", payload.entity_id).maybeSingle();
          if (data?.assigned_to) ids.push(data.assigned_to);
        } else if (moduleName === "Ticket") {
          const { data } = await supabaseAdmin.from("tickets").select("assigned_to").eq("id", payload.entity_id).maybeSingle();
          if (data?.assigned_to) ids.push(data.assigned_to);
        } else if (moduleName === "Requirement") {
          const { data: tasks } = await supabaseAdmin.from("requirement_tasks").select("task_id").eq("requirement_id", payload.entity_id);
          if (tasks && tasks.length > 0) {
             const { data: assigned } = await supabaseAdmin.from("tasks").select("assigned_to").in("id", tasks.map(t => t.task_id));
             if (assigned) assigned.forEach(a => { if(a.assigned_to) ids.push(a.assigned_to); });
          }
        } else if (moduleName === "Workspace") {
          const { data } = await supabaseAdmin.from("workspaces").select("owner_id").eq("id", payload.entity_id).maybeSingle();
          if (data?.owner_id) ids.push(data.owner_id);
        }
      }
      break;

    case "Executors":
      if (moduleName === "Task" && payload.entity_id) {
        const { data } = await supabaseAdmin
          .from("task_participants")
          .select("user_id")
          .eq("task_id", payload.entity_id)
          .eq("participation_role", "EXECUTOR");
        if (data) data.forEach(d => ids.push(d.user_id));
      } else if (moduleName === "Requirement" && payload.entity_id) {
        const { data: tasks } = await supabaseAdmin.from("requirement_tasks").select("task_id").eq("requirement_id", payload.entity_id);
        if (tasks && tasks.length > 0) {
           const { data: execs } = await supabaseAdmin.from("task_participants").select("user_id").in("task_id", tasks.map(t => t.task_id)).eq("participation_role", "EXECUTOR");
           if (execs) execs.forEach(e => ids.push(e.user_id));
        }
      }
      break;

    case "Watchers":
      if (moduleName === "Task" && payload.entity_id) {
        // Fetch explicit watchers from task_participants
        const { data: explicitWatchers } = await supabaseAdmin
          .from("task_participants")
          .select("user_id")
          .eq("task_id", payload.entity_id)
          .eq("participation_role", "WATCHER");
        if (explicitWatchers) explicitWatchers.forEach(d => ids.push(d.user_id));

        // Also check task_watchers table
        const { data: tw } = await supabaseAdmin
          .from("task_watchers")
          .select("user_id")
          .eq("task_id", payload.entity_id)
          .eq("is_deleted", false);
        if (tw) tw.forEach(d => ids.push(d.user_id));
      } else if (moduleName === "Ticket" && payload.entity_id) {
        const { data: tw } = await supabaseAdmin
          .from("ticket_watchers")
          .select("user_id")
          .eq("ticket_id", payload.entity_id);
        if (tw) tw.forEach(d => ids.push(d.user_id));
      } else if (moduleName === "Requirement" && payload.entity_id) {
        const { data: rw } = await supabaseAdmin
          .from("requirement_watchers")
          .select("user_id")
          .eq("requirement_id", payload.entity_id)
          .eq("is_deleted", false);
        if (rw) rw.forEach(d => ids.push(d.user_id));
      }
      break;

    case "Workspace Owner":
      if (payload.workspace_id) {
        const { data } = await supabaseAdmin.from("workspaces").select("owner_id").eq("id", payload.workspace_id).maybeSingle();
        if (data?.owner_id) ids.push(data.owner_id);
      } else if (payload.entity_id) {
        if (moduleName === "Workspace") {
          const { data } = await supabaseAdmin.from("workspaces").select("owner_id").eq("id", payload.entity_id).maybeSingle();
          if (data?.owner_id) ids.push(data.owner_id);
        } else if (moduleName === "Task") {
          const { data: task } = await supabaseAdmin.from("tasks").select("workspace_id").eq("id", payload.entity_id).maybeSingle();
          if (task?.workspace_id) {
            const { data: ws } = await supabaseAdmin.from("workspaces").select("owner_id").eq("id", task.workspace_id).maybeSingle();
            if (ws?.owner_id) ids.push(ws.owner_id);
          }
        }
      }
      break;

    case "Department Admin":
      if (payload.department_id) {
        const { data: deptUsers } = await supabaseAdmin
          .from("user_master")
          .select("id, role:roles(code)")
          .eq("department_id", payload.department_id)
          .eq("is_active", true);
        if (deptUsers) {
          deptUsers.forEach((u: any) => {
            const roleCode = Array.isArray(u.role) ? u.role[0]?.code : u.role?.code;
            if (roleCode && ["ROLE_MANAGER", "ROLE_ADMIN", "SUPER_ADMIN", "DEPT_ADMIN"].includes(roleCode.toUpperCase())) {
              ids.push(u.id);
            }
          });
        }
      }
      break;

    case "Specific Approver":
    case "Approver":
      if (payload.assigned_to) {
        ids.push(payload.assigned_to);
      } else if (payload.approver_id) {
        ids.push(payload.approver_id);
      } else if (payload.entity_id && moduleName === "Requirement") {
        const { data: req } = await supabaseAdmin.from("requirements").select("assigned_to, owner_id").eq("id", payload.entity_id).maybeSingle();
        if (req?.assigned_to) ids.push(req.assigned_to);
        else if (req?.owner_id) ids.push(req.owner_id);
      }
      break;

    case "Requester":
      if (payload.requester_id) ids.push(payload.requester_id);
      else if (payload.created_by) ids.push(payload.created_by);
      else if (payload.entity_id && moduleName === "Ticket") {
        const { data: t } = await supabaseAdmin.from("tickets").select("requester_id, created_by").eq("id", payload.entity_id).maybeSingle();
        if (t?.requester_id) ids.push(t.requester_id);
        else if (t?.created_by) ids.push(t.created_by);
      }
      break;
  }

  return ids;
}
