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

    // 5. Hydrate Templates and Queue
    let humanReadableStatus = payload.status;
    if (humanReadableStatus && humanReadableStatus.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
       const { data: sm } = await supabaseAdmin.from('status_master').select('status_name').eq('id', humanReadableStatus).maybeSingle();
       if (sm && sm.status_name) humanReadableStatus = sm.status_name;
    }

    const validEmails = users.filter(u => u.email).map(u => u.email);
    if (validEmails.length === 0) return;
    
    const recipientEmails = validEmails.join(',');

    const hydratedPayload = { 
      ...payload, 
      status: humanReadableStatus,
      recipient_name: "Team", 
      creator_name: finalCreatorName
    };
    
    const subject = template.subject ? hydrateTemplate(template.subject, hydratedPayload) : "System Notification";
    const htmlBody = template.html_body ? hydrateTemplate(template.html_body, hydratedPayload) : null;
    const bodyTemplate = template.body_template ? hydrateTemplate(template.body_template, hydratedPayload) : null;

    const queueInserts = [{
      recipient_email: recipientEmails,
      subject: subject,
      body_template: htmlBody || bodyTemplate,
      is_sent: false
    }];

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
function hydrateTemplate(text: string, data: any): string {
  let hydrated = text;
  // Match {{key}} pattern
  const matches = hydrated.match(/{{(.*?)}}/g);
  if (matches) {
    matches.forEach(match => {
      const key = match.replace(/[{}]/g, "").trim();
      const value = data[key] !== undefined && data[key] !== null ? data[key] : match;
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
      if (payload.created_by) ids.push(payload.created_by);
      break;
      
    case "Assigned User":
      if (payload.assigned_to) {
        ids.push(payload.assigned_to);
      } else if (moduleName === "Requirement" && payload.entity_id) {
        const { data: tasks } = await supabaseAdmin.from("requirement_tasks").select("task_id").eq("requirement_id", payload.entity_id);
        if (tasks && tasks.length > 0) {
           const { data: assigned } = await supabaseAdmin.from("tasks").select("assigned_to").in("id", tasks.map(t => t.task_id));
           if (assigned) assigned.forEach(a => { if(a.assigned_to) ids.push(a.assigned_to); });
        }
      }
      break;

    case "Specific Approver":
      if (payload.assigned_to) ids.push(payload.assigned_to);
      break;

    case "Requester":
      if (payload.requester_id) ids.push(payload.requester_id);
      else if (payload.assigned_to) ids.push(payload.assigned_to); // Fallback for backwards compatibility
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

    case "Workspace Owner":
      if (moduleName === "Workspace" && payload.entity_id) {
        const { data } = await supabaseAdmin
          .from("workspaces")
          .select("owner_id")
          .eq("id", payload.entity_id)
          .maybeSingle();
        if (data && data.owner_id) ids.push(data.owner_id);
      }
      break;

    case "Department Admin":
      // Look up the user's department, then find users with role 'DEPT_ADMIN' in that department
      if (payload.department_id) {
        const { data: admins } = await supabaseAdmin
          .from("user_master")
          .select("id")
          .eq("department_id", payload.department_id)
          .eq("role_id", "dept_admin_role_id_here"); // In reality, we'd join on roles table
        if (admins) admins.forEach(a => ids.push(a.id));
      }
      break;

    // Future implementations for other dynamic types...
  }

  return ids;
}
