import { supabaseAdmin } from "@/lib/supabase/service_role";
import { stripHtmlToText } from "@/lib/email/email-renderer";

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

    // Chandak Meet sends only what the admin wrote: no template, no email (no built-in text).
    if (moduleName === "Meet" && !(template?.html_body && String(template.html_body).trim())) return;

    // 3. Resolve all recipients across all matched rules
    const recipientUserIds = new Set<string>();
    
    for (const rule of matchedRules) {
      const types = rule.recipient_type as string[];
      for (const type of types) {
        const ids = await resolveRecipientType(type, moduleName, payload);
        ids.forEach(id => recipientUserIds.add(id));
      }
    }

    // Do not suppress the actor if they are configured as an intended recipient in notification_rules
    // (e.g. Creator, Assigned User, Executors). If the user configured those recipient roles, they should receive the email & notification.
    if (payload.suppress_actor && payload.triggering_user_id) {
      recipientUserIds.delete(payload.triggering_user_id);
    }

    // Exclude users who were already directly notified in the same operation (e.g. newly added watchers/executors)
    if (payload.exclude_user_ids && Array.isArray(payload.exclude_user_ids)) {
      payload.exclude_user_ids.forEach((id: string) => recipientUserIds.delete(id));
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

    // Deduplicate valid recipients by lowercase email
    const seenEmails = new Set<string>();
    const uniqueUsers = validUsers.filter(u => {
      const emailLower = u.email.trim().toLowerCase();
      if (seenEmails.has(emailLower)) return false;
      seenEmails.add(emailLower);
      return true;
    });

    // 5.1 Anti-Spam / Rapid Coalescing Gate:
    // Check if an email for this recipient regarding this entity was queued within the last 60 seconds
    // to prevent duplicate emails from rapid multi-triggers (e.g. Task Updated + Executors Changed during same save)
    let candidateUsers = uniqueUsers;
    if (payload.entity_id) {
      const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
      const candidateEmails = uniqueUsers.map(u => u.email.trim().toLowerCase());

      const { data: recentQueued } = await supabaseAdmin
        .from("email_queue")
        .select("recipient_email, subject, body_template")
        .in("recipient_email", candidateEmails)
        .gte("created_at", sixtySecondsAgo);

      if (recentQueued && recentQueued.length > 0) {
        candidateUsers = uniqueUsers.filter(user => {
          const userEmail = user.email.trim().toLowerCase();
          const taskCode = payload.task_code || '';
          const taskName = payload.task_name || '';
          const entityId = String(payload.entity_id);
          const alreadyQueued = recentQueued.some(q => {
            if (q.recipient_email?.toLowerCase() !== userEmail) return false;
            if (entityId && q.body_template?.includes(entityId)) return true;
            if (taskCode && q.subject?.includes(taskCode)) return true;
            if (taskName && q.subject?.includes(taskName)) return true;
            return false;
          });
          if (alreadyQueued) {
            console.log(`[NotificationEngine] Coalesced duplicate email for ${userEmail} on entity ${payload.entity_id} within 60s window.`);
            return false;
          }
          return true;
        });
      }
    }

    if (candidateUsers.length === 0) return;

    const queueInserts = candidateUsers.map(user => {
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
        const isExpiry = eventName.toLowerCase().includes('expir') && moduleName !== 'Task';
        if (isExpiry && (userHydratedPayload.notification_summary || userHydratedPayload.description)) {
          subject = `${moduleName} Expiry: ${userHydratedPayload.notification_summary || userHydratedPayload.description}`;
        } else {
          const itemLabel = userHydratedPayload.task_name || 
                            userHydratedPayload.task_code || 
                            userHydratedPayload.ticket_title || 
                            userHydratedPayload.ticket_code || 
                            userHydratedPayload.workspace_name || 
                            userHydratedPayload.req_name || 
                            userHydratedPayload.ticket_no || 
                            userHydratedPayload.registration_number || 
                            moduleName;
          subject = `${moduleName} ${eventName}: ${itemLabel}`;
        }
      }

      subject = stripHtmlToText(subject);

      let finalHtmlBody: string;
      if (template?.html_body && template.html_body.trim()) {
        finalHtmlBody = hydrateTemplate(template.html_body, userHydratedPayload);
      } else {
        // Dynamically build professional HTML card with all available payload fields
        const cardTitle = `${moduleName} ${eventName}`;
        const actionText = inferActionText(cardTitle, userDirectLink);
        
        finalHtmlBody = buildEmailCardHtml({
          title: cardTitle,
          description: userHydratedPayload.remarks || userHydratedPayload.description || userHydratedPayload.notification_summary,
          details: userHydratedPayload,
          actionUrl: userDirectLink,
          actionText
        });
      }

      finalHtmlBody = transformEmailContentLinks(finalHtmlBody, user.id, user.email, baseUrl);

      if (payload.entity_id) {
        finalHtmlBody += `\n<!-- entity_id:${payload.entity_id} -->`;
      }

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

    // 6.1 Real-Time In-App Notification Stream insertion (notification_queue & task_notifications)
    if (!payload._disableInApp && candidateUsers.length > 0) {
      try {
        const itemLabel = autoHydratedPayload.task_name || 
                          autoHydratedPayload.task_code || 
                          autoHydratedPayload.ticket_title || 
                          autoHydratedPayload.ticket_code || 
                          autoHydratedPayload.workspace_name || 
                          autoHydratedPayload.req_name || 
                          autoHydratedPayload.ticket_no || 
                          autoHydratedPayload.registration_number || 
                          moduleName;
        const notifTitle = `${moduleName} ${eventName}: ${itemLabel}`;
        const notifMessage = autoHydratedPayload.remarks || 
                             autoHydratedPayload.description || 
                             autoHydratedPayload.status_transition || 
                             `${moduleName} ${eventName}`;

        const isWorkspace = moduleName === 'Workspace' || (payload.link?.includes('workspaces') && !payload.link?.includes('task='));
        const isTicket = moduleName === 'Ticket' || payload.link?.includes('tickets');
        const entityType = isWorkspace ? 'workspace' : (isTicket ? 'ticket' : 'task');
        const moduleType = isWorkspace ? 'workspaces' : (isTicket ? 'tickets' : (moduleName.toLowerCase().endsWith('s') ? moduleName.toLowerCase() : `${moduleName.toLowerCase()}s`));
        const extractedEntityId = autoHydratedPayload.task_code || autoHydratedPayload.ticket_no || payload.entity_id || 'SYS';

        const inAppNotifications = candidateUsers.map(user => ({
          target_user_id: user.id,
          recipient_id: user.id,
          entity_type: entityType,
          entity_id: extractedEntityId,
          module: moduleType,
          action_type: eventName.toLowerCase().replace(/\s+/g, '_'),
          actor: finalCreatorName || 'System',
          redirect_url: payload.link || null,
          priority_level: (eventName.toLowerCase().includes('critical') || payload.priority === 'CRITICAL') ? 'CRITICAL' : 'MEDIUM',
          is_read: false,
          payload: {
            title: notifTitle,
            message: notifMessage
          }
        }));

        await supabaseAdmin.from("notification_queue").insert(inAppNotifications);

        if (moduleName === 'Task' && payload.entity_id) {
          const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
          const targetTaskLink = payload.link || `/tasks/${payload.entity_id}`;
          const candidateIds = candidateUsers.map(u => u.id);
          const { data: recentNotifs } = await supabaseAdmin
            .from("task_notifications")
            .select("user_id")
            .in("user_id", candidateIds)
            .ilike("link", `%${payload.entity_id}%`)
            .gte("created_at", sixtySecondsAgo);

          const alreadyNotifiedUserIds = new Set((recentNotifs || []).map((rn: any) => rn.user_id));
          const eligibleTaskUsers = candidateUsers.filter(u => !alreadyNotifiedUserIds.has(u.id));

          if (eligibleTaskUsers.length > 0) {
            const taskNotifs = eligibleTaskUsers.map(user => ({
              user_id: user.id,
              title: `Task ${eventName}: ${itemLabel}`,
              message: notifMessage,
              link: targetTaskLink,
              is_read: false
            }));
            await supabaseAdmin.from("task_notifications").insert(taskNotifs);
          }
        }
      } catch (inAppErr) {
        console.error("[NotificationEngine] Failed to insert in-app notifications:", inAppErr);
      }
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
              const cleanContent = stripHtmlToText(latestComment.content);
              hydrated.remarks = cleanContent;
              hydrated.remark = cleanContent;
            }
          } catch (cErr) {}

          // Also check task_activity_logs for any recent comment or status change message
          if (!hydrated.remarks && !hydrated.remark) {
            try {
              const { data: recentLogs } = await supabaseAdmin
                .from('task_activity_logs')
                .select('new_state')
                .eq('task_id', payload.entity_id)
                .order('created_at', { ascending: false })
                .limit(5);
              if (recentLogs && recentLogs.length > 0) {
                for (const log of recentLogs) {
                  const msg = log.new_state?.message || log.new_state?.remark || log.new_state?.remarks;
                  if (msg && typeof msg === 'string' && msg.trim()) {
                    const cleanMsg = stripHtmlToText(msg.trim());
                    hydrated.remarks = cleanMsg;
                    hydrated.remark = cleanMsg;
                    break;
                  }
                }
              }
            } catch (lErr) {}
          }
        }

        // Clean HTML tags and remove redundant description if identical to remarks
        if (hydrated.remarks) {
          hydrated.remarks = stripHtmlToText(String(hydrated.remarks));
        }
        if (hydrated.remark) {
          hydrated.remark = stripHtmlToText(String(hydrated.remark));
        }
        if (hydrated.description) {
          hydrated.description = stripHtmlToText(String(hydrated.description));
          if (hydrated.remarks && hydrated.description.toLowerCase() === hydrated.remarks.toLowerCase()) {
            delete hydrated.description;
          }
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
        .select('*')
        .eq('id', payload.entity_id)
        .maybeSingle();
      if (ticket) {
        if (!hydrated.ticket_no) hydrated.ticket_no = ticket.code;
        if (!hydrated.ticket_title) hydrated.ticket_title = ticket.title;
        if (!hydrated.description && ticket.description) hydrated.description = ticket.description;
        if (!hydrated.priority && ticket.priority_id) hydrated.priority = ticket.priority_id;
        if (!hydrated.status && ticket.status_id) hydrated.status = ticket.status_id;
        const ticketCategoryId = ticket.category_id || ticket.custom_fields?.category_id;
        if (!hydrated.category && ticketCategoryId) hydrated.category = ticketCategoryId;
        if (!hydrated.assigned_to && ticket.assignee_id) hydrated.assigned_to = ticket.assignee_id;
        if (!hydrated.created_by && ticket.creator_id) hydrated.created_by = ticket.creator_id;

        // Auto-fetch latest ticket comment if remark not passed
        if (!hydrated.remarks && !hydrated.remark) {
          try {
            const { data: latestComment } = await supabaseAdmin
              .from('ticket_comments')
              // the column is "content" (aliased so the rest of this block is unchanged)
              .select('comment:content')
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
        // requirements have no "description" column; the objective is the description
        .select('code, title, description:objective, approval_status, owner_id, requester_id, due_date')
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
    'status_id': { table: 'status_master', column: 'status_name' },
    'old_status': { table: 'status_master', column: 'status_name' },
    'new_status': { table: 'status_master', column: 'status_name' },
    'changed_by': { table: 'user_master', column: 'full_name' }
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

  // Resolve raw status codes into human status names (Item 4.6)
  for (const sKey of ['status', 'old_status', 'new_status', 'status_id']) {
    const val = hydrated[sKey];
    if (val && typeof val === 'string' && val.includes('_') && val === val.toUpperCase()) {
      try {
        const { data: sRow } = await supabaseAdmin.from('status_master').select('status_name').eq('status_code', val).maybeSingle();
        if (sRow?.status_name) hydrated[sKey] = sRow.status_name;
      } catch {}
    }
  }

  // Ensure changed_by / changed_by_name is populated from actor
  if (!hydrated.changed_by && hydrated.triggering_user_id) {
    try {
      const { data: actor } = await supabaseAdmin.from('user_master').select('full_name').eq('id', hydrated.triggering_user_id).maybeSingle();
      if (actor?.full_name) {
        hydrated.changed_by = actor.full_name;
        hydrated.changed_by_name = actor.full_name;
      }
    } catch {}
  }

  // Ensure status_transition is cleanly formatted
  if (hydrated.old_status && (hydrated.new_status || hydrated.status)) {
    const fromName = hydrated.old_status;
    const toName = hydrated.new_status || hydrated.status;
    hydrated.status_transition = `${fromName} → ${toName}`;
  }

  // Title aliases
  if (hydrated.task_name && !hydrated.title) hydrated.title = hydrated.task_name;
  if (hydrated.ticket_title && !hydrated.title) hydrated.title = hydrated.ticket_title;
  if (hydrated.req_name && !hydrated.title) hydrated.title = hydrated.req_name;
  if (hydrated.title && !hydrated.task_name && moduleName === 'Task') hydrated.task_name = hydrated.title;
  if (hydrated.title && !hydrated.ticket_title && moduleName === 'Ticket') hydrated.ticket_title = hydrated.title;

  // Explicit, unambiguous names for assignment emails: who it is assigned TO and who assigned it.
  // (Templates that printed {{creator_name}} next to "Assigned" showed the actor, e.g. "Super Admin".)
  if (hydrated.assigned_to && !hydrated.assignee_name) hydrated.assignee_name = hydrated.assigned_to;
  if (!hydrated.assigned_by_name) hydrated.assigned_by_name = hydrated.changed_by || hydrated.creator_name || "";

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
          value = data['remarks'] || data['remark'] || data['comment'] || data['comments'] || data['message'];
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
      let stringValue = value !== undefined && value !== null ? String(value) : "";
      if (key === 'remark' || key === 'remarks' || key === 'comment' || key === 'comments' || key === 'task_name' || key === 'subject') {
        stringValue = stripHtmlToText(stringValue);
      }
      hydrated = hydrated.replace(match, stringValue);
    });
  }

  // Clean up any empty HTML lines where a field was omitted/empty (e.g. <p>...<strong>Remark:</strong></p>)
  hydrated = hydrated.replace(/<p[^>]*>\s*(?:<span[^>]*>)?\s*<strong[^>]*>[^<]*:?\s*<\/strong>\s*(?:<\/span>)?\s*<\/p>/gi, "");

  return hydrated;
}

// ---------------------------------------------------------------------------
// RECIPIENT RESOLUTION ENGINE
// ---------------------------------------------------------------------------
async function resolveRecipientType(type: string, moduleName: string, payload: any): Promise<string[]> {
  const ids: string[] = [];

  // Chandak Meet: the event says who each role is (attendees, organiser, point owner…)
  if (moduleName === "Meet") {
    const list = payload?.meet_recipients?.[type];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }

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
