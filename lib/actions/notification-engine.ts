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
    const { data: template } = await supabaseAdmin
      .from("email_templates")
      .select("*")
      .eq("module", moduleName)
      .eq("event", eventName)
      .eq("is_active", true)
      .single();

    if (!template) {
      console.warn(`[NotificationEngine] No active template found for ${moduleName} - ${eventName}`);
      return;
    }

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
      .select("id, email, first_name")
      .in("id", Array.from(recipientUserIds));

    if (!users || users.length === 0) return;

    // 5. Hydrate Templates and Queue
    const queueInserts = users.map(user => {
      const hydratedPayload = { ...payload, recipient_name: user.first_name };
      const subject = hydrateTemplate(template.subject, hydratedPayload);
      const htmlBody = hydrateTemplate(template.html_body, hydratedPayload);

      return {
        module: moduleName,
        event: eventName,
        recipient_email: user.email,
        recipient_user_id: user.id,
        subject: subject,
        html_body: htmlBody,
        status: "PENDING"
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
    // We don't await this. We let it run in the background.
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    fetch(`${baseUrl}/api/cron/process-email-queue`, {
      method: 'POST',
      // Small timeout so it doesn't block the calling thread
      signal: AbortSignal.timeout(100) 
    }).catch(() => {
      // Ignore AbortError. The server will still process the request if it reached the API route.
    });
  } catch (e) {
    // Ignore fetch errors
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
      const value = data[key] || "";
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
      if (payload.assigned_to) ids.push(payload.assigned_to);
      break;

    case "Executors":
      // If Task, look up executors
      if (moduleName === "Task" && payload.entity_id) {
        const { data } = await supabaseAdmin
          .from("task_executors")
          .select("user_id")
          .eq("task_id", payload.entity_id);
        if (data) data.forEach(d => ids.push(d.user_id));
      }
      break;

    case "Workspace Owner":
      if (moduleName === "Workspace" && payload.entity_id) {
        const { data } = await supabaseAdmin
          .from("workspaces")
          .select("owner_id")
          .eq("id", payload.entity_id)
          .single();
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
