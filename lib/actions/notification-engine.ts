import { supabaseAdmin } from "@/lib/supabase/service_role";

type NotificationPayload = {
  entity_id: string;
  triggering_user_id: string;
  status?: string;
  [key: string]: any; // Additional data for merge tags
};

export async function queueBusinessEvent(moduleName: string, eventName: string, payload: NotificationPayload) {
  try {
    // 1. Fetch active rules for this event (with fallback between Created and Assigned)
    let { data: rules } = await supabaseAdmin
      .from("notification_rules")
      .select("*")
      .ilike("module", moduleName)
      .ilike("event", eventName)
      .eq("is_active", true);

    if (!rules || rules.length === 0) {
      let fallbackEvent: string | null = null;
      if (eventName === "Created") fallbackEvent = "Assigned";
      else if (eventName === "Assigned") fallbackEvent = "Created";
      else if (eventName === "Assigned (Primary)") fallbackEvent = "Assigned";

      if (fallbackEvent) {
        const { data: fbRules } = await supabaseAdmin
          .from("notification_rules")
          .select("*")
          .ilike("module", moduleName)
          .ilike("event", fallbackEvent)
          .eq("is_active", true);
        if (fbRules && fbRules.length > 0) {
          rules = fbRules;
        }
      }
    }

    if (!rules || rules.length === 0) return;

    // Filter rules by status if applicable
    const matchedRules = rules.filter(r => 
      !r.status_trigger || r.status_trigger === "ANY" || r.status_trigger === payload.status
    );

    if (matchedRules.length === 0) return;

    // 2. Fetch the active template for this event (prioritizing recently updated/customized templates)
    let { data: templates } = await supabaseAdmin
      .from("email_templates")
      .select("*")
      .ilike("module", moduleName)
      .ilike("event", eventName)
      .eq("is_active", true)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1);

    let template = templates && templates.length > 0 ? templates[0] : null;

    if (!template) {
      let fallbackEvent: string | null = null;
      if (eventName === "Created") fallbackEvent = "Assigned";
      else if (eventName === "Assigned") fallbackEvent = "Created";
      else if (eventName === "Assigned (Primary)") fallbackEvent = "Assigned";

      if (fallbackEvent) {
        const { data: fbTemplates } = await supabaseAdmin
          .from("email_templates")
          .select("*")
          .ilike("module", moduleName)
          .ilike("event", fallbackEvent)
          .eq("is_active", true)
          .order("updated_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(1);
        if (fbTemplates && fbTemplates.length > 0) {
          template = fbTemplates[0];
        }
      }
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

    // Suppress triggering user only for collaborative actions (e.g., Comment Added, Status Changed, Updated)
    // where the actor is already aware of their action, UNLESS the rule explicitly targets them (e.g. Creator on Created event)
    const isCreationOrAssignmentEvent = eventName.toLowerCase().includes('create') || 
                                        eventName.toLowerCase().includes('assign') || 
                                        eventName.toLowerCase().includes('enrolled');
    
    const rulesTargetCreator = matchedRules.some(r => {
      const types = (r.recipient_type || []) as string[];
      return types.includes("Creator") || types.includes("Workspace Owner") || types.includes("Requester");
    });

    if (!isCreationOrAssignmentEvent && !rulesTargetCreator && payload.triggering_user_id) {
      recipientUserIds.delete(payload.triggering_user_id);
    }

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
    const { buildEmailCardHtml, inferActionText } = await import('@/lib/email/email-renderer');
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chandakgroup.tech";

    let autoHydratedPayload = await autoHydratePayload(payload, moduleName);

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

      let subject = `${moduleName} ${eventName}`;
      if (template?.subject) {
        subject = hydrateTemplate(template.subject, userHydratedPayload);
      } else {
        if (userHydratedPayload.notification_summary || userHydratedPayload.description) {
          subject = `${moduleName} Expiry: ${userHydratedPayload.notification_summary || userHydratedPayload.description}`;
        } else {
          const itemLabel = userHydratedPayload.task_name || 
                            userHydratedPayload.ticket_title || 
                            userHydratedPayload.workspace_name || 
                            userHydratedPayload.req_name || 
                            userHydratedPayload.ticket_no || 
                            moduleName;
          subject = `${moduleName} ${eventName}: ${itemLabel}`;
        }
      }

      let finalHtmlBody: string;
      if (template?.html_body && template.html_body.trim()) {
        finalHtmlBody = hydrateTemplate(template.html_body, userHydratedPayload);
      } else {
        // Dynamically build professional HTML card with all available payload fields
        const cardTitle = `${moduleName} ${eventName}`;
        const actionText = inferActionText(cardTitle, userDirectLink);
        
        finalHtmlBody = buildEmailCardHtml({
          title: cardTitle,
          description: userHydratedPayload.description || userHydratedPayload.notification_summary,
          details: userHydratedPayload,
          actionUrl: userDirectLink,
          actionText
        });
      }

      finalHtmlBody = transformEmailContentLinks(finalHtmlBody, user.id, user.email, baseUrl);

      return {
        recipient_email: user.email,
        subject: subject,
        body_template: finalHtmlBody,
        is_sent: false
      };
    });

    // 6. Async Batch Insert into Queue (valid columns only)
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
async function autoHydratePayload(payload: any, moduleName?: string) {
  const hydrated = { ...payload };
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Task-specific auto-enrichment
  if (moduleName === 'Task' && payload.entity_id) {
    try {
      const { data: task } = await supabaseAdmin
        .from('tasks')
        .select('id, subject, description, priority_id, status_id, start_date, end_date, assigned_to, created_by, workspace_id, parent_task_id')
        .eq('id', payload.entity_id)
        .maybeSingle();

      if (task) {
        if (!hydrated.task_name) hydrated.task_name = task.subject;
        if (!hydrated.subject) hydrated.subject = task.subject;
        if (!hydrated.description && task.description) hydrated.description = task.description;
        if (!hydrated.priority && task.priority_id) hydrated.priority = task.priority_id;
        if (!hydrated.status && task.status_id) hydrated.status = task.status_id;
        if (!hydrated.start_date && task.start_date) hydrated.start_date = task.start_date;
        if (!hydrated.end_date && task.end_date) hydrated.end_date = task.end_date;
        if (!hydrated.due_date && task.end_date) hydrated.due_date = task.end_date;
        if (!hydrated.assigned_to && task.assigned_to) hydrated.assigned_to = task.assigned_to;
        if (!hydrated.created_by && task.created_by) hydrated.created_by = task.created_by;
        if (!hydrated.workspace_id && task.workspace_id) hydrated.workspace_id = task.workspace_id;

        // Auto-fetch workspace details
        if (task.workspace_id && (!hydrated.workspace_name || !hydrated.workspace_code)) {
          try {
            const { data: ws } = await supabaseAdmin
              .from('workspaces')
              .select('workspace_name, workspace_code')
              .eq('id', task.workspace_id)
              .maybeSingle();
            if (ws) {
              if (!hydrated.workspace_name) hydrated.workspace_name = ws.workspace_name;
              if (!hydrated.workspace_code) hydrated.workspace_code = ws.workspace_code;
            }
          } catch (wErr) {}
        }

        // Subtask enrichment
        if (task.parent_task_id) {
          hydrated.is_subtask = true;
          hydrated.task_type = 'Subtask';
          try {
            const { data: parentTask } = await supabaseAdmin
              .from('tasks')
              .select('subject')
              .eq('id', task.parent_task_id)
              .maybeSingle();
            if (parentTask?.subject) {
              hydrated.parent_task_name = parentTask.subject;
            }
          } catch (e) {
            // Ignore parent task lookup error
          }
        } else {
          hydrated.is_subtask = false;
          hydrated.task_type = 'Task';
        }

        // Try to find if this task is linked to a requirement or ticket
        if (!hydrated.ticket_no) {
          try {
            const { data: reqTask } = await supabaseAdmin
              .from('requirement_tasks')
              .select('requirement_id, requirements(id, code, title, source_ticket_id)')
              .eq('task_id', payload.entity_id)
              .maybeSingle();

            if (reqTask?.requirements) {
              const req = reqTask.requirements as any;
              if (req.source_ticket_id) {
                const { data: ticket } = await supabaseAdmin
                  .from('tickets')
                  .select('code')
                  .eq('id', req.source_ticket_id)
                  .maybeSingle();
                if (ticket?.code) hydrated.ticket_no = ticket.code;
              } else if (req.code) {
                hydrated.ticket_no = req.code;
              }
            }
          } catch (rErr) {}
        }

        // Auto-fetch latest remark/comment for this task if not passed directly in payload
        if (!hydrated.remarks && !hydrated.remark) {
          try {
            const { data: latestComment } = await supabaseAdmin
              .from('task_comments')
              .select('content')
              .eq('task_id', payload.entity_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (latestComment?.content) {
              hydrated.remarks = latestComment.content;
              hydrated.remark = latestComment.content;
            }
          } catch (cErr) {}
        }
      }
    } catch (e) {
      console.error('[NotificationEngine] Task auto-enrichment failed', e);
    }
  }

  // Workspace-specific auto-enrichment
  if (moduleName === 'Workspace' && payload.entity_id) {
    try {
      const { data: ws } = await supabaseAdmin
        .from('workspaces')
        .select(`
          id,
          workspace_name,
          workspace_code,
          description,
          start_date,
          end_date,
          status_id,
          company_id,
          workspace_owner_id,
          parent_workspace_id,
          status:status_master!workspaces_status_id_fkey(status_name),
          company:company_master(company_name),
          parent:workspaces!parent_workspace_id(workspace_name)
        `)
        .eq('id', payload.entity_id)
        .maybeSingle();

      if (ws) {
        const d = ws as any;
        const statusName = d.status?.status_name || (Array.isArray(d.status) && d.status[0]?.status_name);
        const companyName = d.company?.company_name || (Array.isArray(d.company) && d.company[0]?.company_name);
        const parentName = d.parent?.workspace_name || (Array.isArray(d.parent) && d.parent[0]?.workspace_name);

        let ownerName = null;
        if (d.workspace_owner_id) {
          const { data: u } = await supabaseAdmin.from('user_master').select('full_name').eq('id', d.workspace_owner_id).maybeSingle();
          if (u?.full_name) ownerName = u.full_name;
        }

        if (!hydrated.workspace_name) hydrated.workspace_name = d.workspace_name;
        if (!hydrated.workspace_code) hydrated.workspace_code = d.workspace_code;
        if (!hydrated.description && d.description) hydrated.description = d.description;
        if (!hydrated.status && statusName) hydrated.status = statusName;
        if (!hydrated.status_id && d.status_id) hydrated.status_id = d.status_id;
        if (!hydrated.company_name && companyName) hydrated.company_name = companyName;
        if (!hydrated.start_date && d.start_date) hydrated.start_date = d.start_date;
        if (!hydrated.end_date && d.end_date) hydrated.end_date = d.end_date;
        if (!hydrated.due_date && d.end_date) hydrated.due_date = d.end_date;
        if (!hydrated.workspace_owner && ownerName) hydrated.workspace_owner = ownerName;
        if (!hydrated.owner_name && ownerName) hydrated.owner_name = ownerName;
        if (!hydrated.workspace_owner_id && d.workspace_owner_id) hydrated.workspace_owner_id = d.workspace_owner_id;
        if (!hydrated.owner_id && d.workspace_owner_id) hydrated.owner_id = d.workspace_owner_id;
        if (!hydrated.parent_workspace && parentName) hydrated.parent_workspace = parentName;
        if (!hydrated.parent_workspace_name && parentName) hydrated.parent_workspace_name = parentName;
        if (!hydrated.type) hydrated.type = d.parent_workspace_id ? 'Sub-Workspace' : 'Workspace';
        if (!hydrated.role) hydrated.role = 'Workspace Lead';
      }
    } catch (e) {
      console.error('[NotificationEngine] Workspace auto-enrichment failed', e);
    }
  }

  // Ticket-specific auto-enrichment
  if (moduleName === 'Ticket' && payload.entity_id) {
    try {
      const { data: ticket } = await supabaseAdmin
        .from('tickets')
        .select('code, title, description, priority_id, status_id, category_id, assignee_id, creator_id')
        .eq('id', payload.entity_id)
        .maybeSingle();
      if (ticket) {
        if (!hydrated.ticket_no) hydrated.ticket_no = ticket.code;
        if (!hydrated.ticket_title) hydrated.ticket_title = ticket.title;
        if (!hydrated.description && ticket.description) hydrated.description = ticket.description;
        if (!hydrated.priority && ticket.priority_id) hydrated.priority = ticket.priority_id;
        if (!hydrated.status && ticket.status_id) hydrated.status = ticket.status_id;
        if (!hydrated.category && ticket.category_id) hydrated.category = ticket.category_id;
        if (!hydrated.assigned_to && ticket.assignee_id) hydrated.assigned_to = ticket.assignee_id;
        if (!hydrated.created_by && ticket.creator_id) hydrated.created_by = ticket.creator_id;

        // Auto-fetch latest ticket comment if remark not passed
        if (!hydrated.remarks && !hydrated.remark) {
          try {
            const { data: latestComment } = await supabaseAdmin
              .from('ticket_comments')
              .select('comment')
              .eq('ticket_id', payload.entity_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (latestComment?.comment) {
              hydrated.remarks = latestComment.comment;
              hydrated.remark = latestComment.comment;
            }
          } catch (tErr) {}
        }
      }
    } catch (e) {
      console.error('[NotificationEngine] Ticket auto-enrichment failed', e);
    }
  }

  // Requirement-specific auto-enrichment
  if (moduleName === 'Requirement' && payload.entity_id) {
    try {
      const { data: req } = await supabaseAdmin
        .from('requirements')
        .select('code, title, description, approval_status, owner_id, requester_id, due_date')
        .eq('id', payload.entity_id)
        .maybeSingle();
      if (req) {
        if (!hydrated.req_code) hydrated.req_code = req.code;
        if (!hydrated.req_name) hydrated.req_name = req.title;
        if (!hydrated.description && req.description) hydrated.description = req.description;
        if (!hydrated.approval_status) hydrated.approval_status = req.approval_status;
        if (!hydrated.assigned_to && req.owner_id) hydrated.assigned_to = req.owner_id;
        if (!hydrated.requester_id && req.requester_id) hydrated.requester_id = req.requester_id;
        if (!hydrated.due_date && req.due_date) hydrated.due_date = req.due_date;
      }
    } catch (e) {
      console.error('[NotificationEngine] Requirement auto-enrichment failed', e);
    }
  }

  // Vehicle-specific auto-enrichment (FleetDesk & Statutory Expiries)
  if ((moduleName === 'Vehicle' || moduleName === 'Vehicle (FleetDesk)') && payload.entity_id) {
    try {
      const { data: veh } = await supabaseAdmin
        .from('vehicles')
        .select('id, registration_number, make, model, fuel_type, rto_office, insurance_vendor, insurance_policy_number, insurance_expiry_date, puc_expiry_date, fitness_expiry_date, odometer_km, owner_id')
        .eq('id', payload.entity_id)
        .maybeSingle();
      if (veh) {
        if (!hydrated.registration_number) hydrated.registration_number = veh.registration_number;
        if (!hydrated.vehicle_name) hydrated.vehicle_name = `${veh.make} ${veh.model}`;
        if (!hydrated.rto_office) hydrated.rto_office = veh.rto_office;
        if (!hydrated.insurance_vendor) hydrated.insurance_vendor = veh.insurance_vendor;
        if (!hydrated.insurance_policy_number) hydrated.insurance_policy_number = veh.insurance_policy_number;
        if (!hydrated.insurance_expiry_date) hydrated.insurance_expiry_date = veh.insurance_expiry_date;
        if (!hydrated.puc_expiry_date) hydrated.puc_expiry_date = veh.puc_expiry_date;
        if (!hydrated.fitness_expiry_date) hydrated.fitness_expiry_date = veh.fitness_expiry_date;
        if (!hydrated.odometer_km) hydrated.odometer_km = veh.odometer_km;
        if (!hydrated.owner_id && veh.owner_id) hydrated.owner_id = veh.owner_id;
        
        // Fetch driver assigned to this vehicle
        const { data: drv } = await supabaseAdmin.from('drivers').select('id, full_name, phone').eq('assigned_vehicle_id', veh.id).maybeSingle();
        if (drv) {
          if (!hydrated.assigned_driver_id) hydrated.assigned_driver_id = drv.id;
          if (!hydrated.driver_name) hydrated.driver_name = drv.full_name;
          if (!hydrated.driver_phone) hydrated.driver_phone = drv.phone;
        }
      }
    } catch (e) {
      console.error('[NotificationEngine] Vehicle auto-enrichment failed', e);
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
    'workspace_id': { table: 'workspaces', column: 'workspace_name' },
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

  // Set aliases for common merge tags across all modules
  if (hydrated.assigned_to && !hydrated.assigned_user) {
    hydrated.assigned_user = hydrated.assigned_to;
  }
  if (hydrated.assigned_user && !hydrated.assigned_to) {
    hydrated.assigned_to = hydrated.assigned_user;
  }
  if (hydrated.workspace_id && !hydrated.workspace_name) {
    hydrated.workspace_name = hydrated.workspace_id;
  }
  if (hydrated.end_date && !hydrated.due_date) {
    hydrated.due_date = hydrated.end_date;
  }
  if (hydrated.due_date && !hydrated.end_date) {
    hydrated.end_date = hydrated.due_date;
  }
  if (hydrated.workspace_owner && !hydrated.owner_name) {
    hydrated.owner_name = hydrated.workspace_owner;
  }
  if (hydrated.owner_name && !hydrated.workspace_owner) {
    hydrated.workspace_owner = hydrated.owner_name;
  }
  if (hydrated.parent_workspace && !hydrated.parent_workspace_name) {
    hydrated.parent_workspace_name = hydrated.parent_workspace;
  }
  if (hydrated.parent_workspace_name && !hydrated.parent_workspace) {
    hydrated.parent_workspace = hydrated.parent_workspace_name;
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
      const rawKey = match.replace(/[{}]/g, "").trim();
      const key = rawKey.toLowerCase();
      let value = data[rawKey] !== undefined ? data[rawKey] : data[key];

      // Robust fallback aliases if key has alternative representation
      if (value === undefined || value === null || value === "") {
        if (key === 'remark' || key === 'remarks' || key === 'comment' || key === 'comments') {
          value = data['remarks'] || data['remark'] || data['comment'] || data['comments'] || data['message'] || data['description'];
        }
        else if (key === 'workspace_owner' || key === 'owner_name') value = data['workspace_owner'] || data['owner_name'] || data['creator_name'];
        else if (key === 'assigned_user' || key === 'assigned_to') value = data['assigned_user'] || data['assigned_to'] || data['recipient_name'];
        else if (key === 'due_date' || key === 'end_date') value = data['due_date'] || data['end_date'];
        else if (key === 'start_date') value = data['start_date'];
        else if (key === 'parent_workspace' || key === 'parent_workspace_name') value = data['parent_workspace'] || data['parent_workspace_name'];
        else if (key === 'task_name' || key === 'task' || key === 'subject') value = data['task_name'] || data['subject'] || data['ticket_title'];
        else if (key === 'task_code' || key === 'code') value = data['task_code'] || data['code'] || data['ticket_no'];
        else if (key === 'ticket_title' || key === 'title') value = data['ticket_title'] || data['title'] || data['task_name'];
        else if (key === 'ticket_no' || key === 'ticket_number') value = data['ticket_no'] || data['task_code'];
        else if (key === 'workspace_name' || key === 'workspace') value = data['workspace_name'] || data['sub_workspace_name'];
        else if (key === 'workspace_code') value = data['workspace_code'];
        else if (key === 'creator_name' || key === 'updated_by' || key === 'created_by' || key === 'assigned_by') value = data['creator_name'] || data['updated_by'] || data['created_by'];
        else if (key === 'status' || key === 'new_status') value = data['status'];
        else if (key === 'priority') value = data['priority'];
        else if (key === 'description') value = data['description'];
      }
      hydrated = hydrated.replace(match, value !== undefined && value !== null ? String(value) : "");
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
          const { data } = await supabaseAdmin.from("tasks").select("created_by").eq("id", payload.entity_id).maybeSingle();
          if (data?.created_by) ids.push(data.created_by);
        } else if (moduleName === "Ticket") {
          const { data } = await supabaseAdmin.from("tickets").select("creator_id").eq("id", payload.entity_id).maybeSingle();
          if (data?.creator_id) ids.push(data.creator_id);
        } else if (moduleName === "Requirement") {
          const { data } = await supabaseAdmin.from("requirements").select("creator_id").eq("id", payload.entity_id).maybeSingle();
          if (data?.creator_id) ids.push(data.creator_id);
        } else if (moduleName === "Workspace") {
          const { data } = await supabaseAdmin.from("workspaces").select("created_by, workspace_owner_id").eq("id", payload.entity_id).maybeSingle();
          if (data?.created_by) ids.push(data.created_by);
          else if (data?.workspace_owner_id) ids.push(data.workspace_owner_id);
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
          const { data } = await supabaseAdmin.from("tickets").select("assignee_id").eq("id", payload.entity_id).maybeSingle();
          if (data?.assignee_id) ids.push(data.assignee_id);
        } else if (moduleName === "Requirement") {
          const { data: tasks } = await supabaseAdmin.from("requirement_tasks").select("task_id").eq("requirement_id", payload.entity_id);
          if (tasks && tasks.length > 0) {
             const { data: assigned } = await supabaseAdmin.from("tasks").select("assigned_to").in("id", tasks.map(t => t.task_id));
             if (assigned) assigned.forEach(a => { if(a.assigned_to) ids.push(a.assigned_to); });
          }
        } else if (moduleName === "Workspace") {
          const { data: ws } = await supabaseAdmin.from("workspaces").select("workspace_owner_id").eq("id", payload.entity_id).maybeSingle();
          if (ws?.workspace_owner_id) ids.push(ws.workspace_owner_id);
          const { data: members } = await supabaseAdmin.from("workspace_members").select("user_id").eq("workspace_id", payload.entity_id).eq("is_deleted", false);
          if (members) members.forEach(m => { if (m.user_id) ids.push(m.user_id); });
        } else if (moduleName === "Vehicle" || moduleName === "Vehicle (FleetDesk)") {
          if (payload.assigned_driver_id) ids.push(payload.assigned_driver_id);
        }
      }
      break;

    case "Assigned Driver":
      if (payload.assigned_driver_id) {
        ids.push(payload.assigned_driver_id);
      } else if (payload.driver_id) {
        ids.push(payload.driver_id);
      } else if (payload.entity_id && (moduleName === "Vehicle" || moduleName === "Vehicle (FleetDesk)")) {
        const { data: drv } = await supabaseAdmin.from("drivers").select("id").eq("assigned_vehicle_id", payload.entity_id).maybeSingle();
        if (drv?.id) ids.push(drv.id);
      }
      break;

    case "Fleet Manager / Admin":
      const { data: fleetAdmins } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, roles!inner(code)")
        .or("code.eq.SUPER_ADMIN,code.eq.ROLE_ADMIN,code.eq.ADMIN,code.eq.FLEET_ADMIN", { foreignTable: "roles" });
      if (fleetAdmins) fleetAdmins.forEach(fa => { if (fa.user_id) ids.push(fa.user_id); });
      break;

    case "Vehicle Owner":
      if (payload.owner_id) {
        ids.push(payload.owner_id);
      } else if (payload.entity_id && (moduleName === "Vehicle" || moduleName === "Vehicle (FleetDesk)")) {
        const { data: veh } = await supabaseAdmin.from("vehicles").select("owner_id").eq("id", payload.entity_id).maybeSingle();
        if (veh?.owner_id) ids.push(veh.owner_id);
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
      if (payload.workspace_owner_id) {
        ids.push(payload.workspace_owner_id);
      } else if (payload.owner_id) {
        ids.push(payload.owner_id);
      } else if (payload.workspace_id) {
        const { data } = await supabaseAdmin.from("workspaces").select("workspace_owner_id").eq("id", payload.workspace_id).maybeSingle();
        if (data?.workspace_owner_id) ids.push(data.workspace_owner_id);
      } else if (payload.entity_id) {
        if (moduleName === "Workspace") {
          const { data } = await supabaseAdmin.from("workspaces").select("workspace_owner_id").eq("id", payload.entity_id).maybeSingle();
          if (data?.workspace_owner_id) ids.push(data.workspace_owner_id);
        } else if (moduleName === "Task") {
          const { data: task } = await supabaseAdmin.from("tasks").select("workspace_id").eq("id", payload.entity_id).maybeSingle();
          if (task?.workspace_id) {
            const { data: ws } = await supabaseAdmin.from("workspaces").select("workspace_owner_id").eq("id", task.workspace_id).maybeSingle();
            if (ws?.workspace_owner_id) ids.push(ws.workspace_owner_id);
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
        const { data: req } = await supabaseAdmin.from("requirements").select("current_assignee_id, owner_id").eq("id", payload.entity_id).maybeSingle();
        if (req?.current_assignee_id) ids.push(req.current_assignee_id);
        else if (req?.owner_id) ids.push(req.owner_id);
      }
      break;

    case "Requester":
      if (payload.requester_id) ids.push(payload.requester_id);
      else if (payload.created_by) ids.push(payload.created_by);
      else if (payload.creator_id) ids.push(payload.creator_id);
      else if (payload.entity_id && moduleName === "Ticket") {
        const { data: t } = await supabaseAdmin.from("tickets").select("creator_id").eq("id", payload.entity_id).maybeSingle();
        if (t?.creator_id) ids.push(t.creator_id);
      } else if (payload.entity_id && moduleName === "Requirement") {
        const { data: r } = await supabaseAdmin.from("requirements").select("requester_id, creator_id").eq("id", payload.entity_id).maybeSingle();
        if (r?.requester_id) ids.push(r.requester_id);
        else if (r?.creator_id) ids.push(r.creator_id);
      }
      break;
  }

  return ids;
}
