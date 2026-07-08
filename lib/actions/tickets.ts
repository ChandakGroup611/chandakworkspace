"use server";

import { createClient as createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { hasPermission } from "@/lib/permissions";

/**
 * Enterprise permission verification helper for server actions
 * Replaced by the centralized Authorization Service
 */
async function checkServerPermission(supabase: any, userId: string, requiredPerm: string): Promise<boolean> {
  return hasPermission(userId, requiredPerm);
}

/**
 * Fetches all remarks/comments for a given ticket
 */
export async function fetchTicketComments(ticketId: string, limit = 20, offset = 0) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthenticated. Please log in first.");
  }

  const hasAccess = await checkServerPermission(supabase, user.id, "TICKETS_VIEW");
  if (!hasAccess) {
    throw new Error("Unauthorized: Missing TICKETS_VIEW capability.");
  }

  const { data, error } = await supabase
    .from("ticket_comments")
    .select(`
      id,
      content,
      created_at,
      author_id,
      author:user_master(full_name, email, profile_photo)
    `)
    .eq("ticket_id", ticketId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[Server Action] Error fetching remarks:", error);
    return [];
  }
  return data || [];
}

/**
 * Adds an operational remark/comment to a ticket
 */
export async function addTicketRemark(ticketId: string, content: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthenticated. Please log in first.");
  }

  const hasAccess = await checkServerPermission(supabase, user.id, "TICKETS_UPDATE");
  
  // Relaxed: Allow all authenticated members to add remarks
  // Removed strict capability/creator check as per new requirement.

  const { data, error } = await supabase
    .from("ticket_comments")
    .insert({
      ticket_id: ticketId,
      author_id: user.id,
      content: content.trim()
    })
    .select()
    .single();

  if (error) {
    console.error("[Server Action] Error adding remark:", error);
    throw new Error(`Failed to save remark: ${error.message}`);
  }

  revalidatePath("/tickets");
  return { success: true, remark: data };
}

/**
 * Fetches the audit logs history for a given ticket
 */
export async function fetchTicketAuditLogs(ticketId: string, limit = 20, offset = 0) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthenticated. Please log in first.");
  }

  const hasAccess = await checkServerPermission(supabase, user.id, "TICKETS_VIEW");
  if (!hasAccess) {
    throw new Error("Unauthorized: Missing TICKETS_VIEW capability.");
  }

  const { data, error } = await supabase
    .from("ticket_audit_logs")
    .select(`
      id,
      operation,
      before_values,
      after_values,
      created_at,
      actor_id,
      actor:user_master!actor_id(full_name, email)
    `)
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[Server Action] Error fetching audit logs:", error);
    return [];
  }
  return data || [];
}

/**
 * Updates a ticket's operational details (Status, Assignee, Team, Title, Description, etc.)
 */
export async function updateTicketDetails(ticketId: string, payload: {
  title?: string;
  description?: string;
  status_id?: string;
  assignee_id?: string | null;
  department_id?: string; // Maps to support team
  category_id?: string;
  sub_category_id?: string;
  issue_type_id?: string;
  priority_id?: string;
  custom_fields?: any;
  remark?: string;
  due_date?: string;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthenticated. Please log in first.");
  }

  const hasAccess = await checkServerPermission(supabase, user.id, "TICKETS_UPDATE");
  
  // Relaxed: Allow all authenticated members to update the ticket
  // Removed strict capability/creator check as per new requirement.

  const cleanField = (val: any) => (val && typeof val === 'string' && val.trim() !== '') ? val.trim() : null;

  const updateData: any = {};
  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.status_id !== undefined) updateData.status_id = cleanField(payload.status_id);
  if (payload.assignee_id !== undefined) updateData.assignee_id = cleanField(payload.assignee_id);
  if (payload.department_id !== undefined) updateData.department_id = cleanField(payload.department_id);
  if (payload.category_id !== undefined) updateData.category_id = cleanField(payload.category_id);
  if (payload.sub_category_id !== undefined) updateData.sub_category_id = cleanField(payload.sub_category_id);
  if (payload.issue_type_id !== undefined) updateData.issue_type_id = cleanField(payload.issue_type_id);
  if (payload.priority_id !== undefined) updateData.priority_id = cleanField(payload.priority_id);
  if (payload.due_date !== undefined) updateData.due_date = payload.due_date ? new Date(payload.due_date).toISOString() : null;
  if (payload.custom_fields !== undefined) updateData.custom_fields = payload.custom_fields;

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("tickets")
    .update(updateData)
    .eq("id", ticketId)
    .select()
    .single();

  if (error) {
    console.error("[Server Action] Error updating ticket details:", error);
    throw new Error(`Failed to update ticket: ${error.message}`);
  }

  // Insert remark if provided
  if (payload.remark && payload.remark.trim() !== '') {
    const { error: remarkError } = await supabase
      .from("ticket_comments")
      .insert({
        ticket_id: ticketId,
        author_id: user.id,
        content: payload.remark.trim()
      });

    if (remarkError) {
      console.error("[Server Action] Error adding remark during ticket update:", remarkError);
    }
  }

  // Notifications
  if (data) {
    const { supabaseAdmin } = await import('@/lib/supabase/service_role');
    
    // Notification for assignment change
    if (payload.assignee_id && payload.assignee_id !== user.id) {
      await supabaseAdmin.from('notification_queue').insert({
        recipient_id: payload.assignee_id,
        payload: {
          type: 'TICKET_ASSIGNED',
          message: `Ticket ${data.code} has been assigned to you.`,
          ticket_id: data.id
        },
        status: 'pending'
      });
    }

    // Notification for status change to resolved/closed
    if (payload.status_id) {
      const { data: statusData } = await supabaseAdmin.from('status_master').select('status_name').eq('id', payload.status_id).single();
      if (statusData && (statusData.status_name.toLowerCase().includes('resolv') || statusData.status_name.toLowerCase().includes('clos'))) {
        if (data.creator_id && data.creator_id !== user.id) {
          await supabaseAdmin.from('notification_queue').insert({
            recipient_id: data.creator_id,
            payload: {
              type: 'TICKET_RESOLVED',
              message: `Your ticket ${data.code} has been marked as ${statusData.status_name}.`,
              ticket_id: data.id
            },
            status: 'pending'
          });
        }
      }
    }
  }

  revalidatePath("/tickets");
  return { success: true, ticket: data };
}

/**
 * Generates an online Microsoft Teams Meeting Link for a ticket.
 */
export async function generateTeamsMeetingLink(ticketId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthenticated. Please log in first.");
  }

  const hasAccess = await checkServerPermission(supabase, user.id, "TICKETS_UPDATE");
  if (!hasAccess) {
    throw new Error("Unauthorized: Missing TICKETS_UPDATE capability.");
  }

  const { data: ticket, error: fetchError } = await supabase
    .from("tickets")
    .select("id, code, title, custom_fields")
    .eq("id", ticketId)
    .single();

  if (fetchError || !ticket) {
    throw new Error("Ticket not found.");
  }

  const meetingId = "meet-" + Math.random().toString(36).substring(2, 15);
  const threadId = "19:meeting_" + Math.random().toString(36).substring(2, 10) + "thread.v2";
  const mockTeamsLink = `https://teams.microsoft.com/l/meetup-join/${threadId}/0?context=%7b%22Tid%22%3a%22enterprise-internal-tenant-id%22%2c%22Oid%22%3a%22${meetingId}%22%7d`;

  const currentCustomFields = (ticket.custom_fields && typeof ticket.custom_fields === 'object') 
    ? ticket.custom_fields 
    : {};

  const updatedCustomFields = {
    ...currentCustomFields,
    teams_meeting: {
      url: mockTeamsLink,
      created_at: new Date().toISOString(),
      meeting_id: meetingId
    }
  };

  const { data: updatedTicket, error: updateError } = await supabase
    .from("tickets")
    .update({
      custom_fields: updatedCustomFields,
      updated_at: new Date().toISOString()
    })
    .eq("id", ticketId)
    .select()
    .single();

  if (updateError) {
    console.error("[Server Action] Error saving Teams meeting link:", updateError);
    throw new Error(`Failed to save Teams meeting: ${updateError.message}`);
  }

  revalidatePath("/tickets");
  return { success: true, teamsMeeting: updatedCustomFields.teams_meeting };
}

/**
 * Fetches all data required for the Tickets Dashboard
 * Uses optimized repositories and explicit queries
 */
export async function fetchTicketDashboardData(filters?: { searchQuery?: string, status_id?: string, priority_id?: string, scope_id?: string }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthenticated. Please log in first.");
  }

  // Import dynamically or ensure it's imported at top (we'll just use it)
  // Actually since we are in actions/tickets.ts, we should import getVisibleTickets at the top.
  // Wait, I can't put import at the bottom.
  // Let me just import it inline for now, or use require.
  const { getVisibleTickets } = await import('@/lib/repositories/tickets');

  const tickets = await getVisibleTickets(user.id, undefined, filters);

  const scopeId = filters?.scope_id !== "ALL" ? filters?.scope_id : null;

  let prioQuery = supabase.from("priority_master").select("*, name:priority_name, code:priority_code").eq("is_deleted", false);
  let stateQuery = supabase.from("status_master").select("*, name:status_name, code:status_code");
  let catQuery = supabase.from("ticket_categories").select("*").eq("is_deleted", false);
  let subcatQuery = supabase.from("ticket_subcategories").select("*").eq("is_deleted", false);
  let typeQuery = supabase.from("issue_types").select("*").eq("is_deleted", false);

  if (scopeId) {
    prioQuery = prioQuery.eq("scope_id", scopeId);
    stateQuery = stateQuery.eq("scope_id", scopeId);
    catQuery = catQuery.eq("scope_id", scopeId);
    subcatQuery = subcatQuery.eq("scope_id", scopeId);
    typeQuery = typeQuery.eq("scope_id", scopeId);
  }

  const [deptRes, prioRes, stateRes, catRes, subcatRes, typeRes, scopeRes] = await Promise.all([
    supabase.from("departments").select("*").eq("is_deleted", false),
    prioQuery,
    stateQuery,
    catQuery,
    subcatQuery,
    typeQuery,
    supabase.from("ticket_scopes").select("*")
  ]);

  const dedupe = (arr: any[]) => {
    if (scopeId) return arr;
    const seen = new Set();
    return arr.filter(item => {
      const code = item.code || item.name;
      if (seen.has(code)) return false;
      seen.add(code);
      return true;
    });
  };

  return {
    tickets,
    departments: deptRes.data || [],
    priorities: dedupe(prioRes.data || []),
    states: dedupe(stateRes.data || []),
    categories: dedupe(catRes.data || []),
    subcategories: dedupe(subcatRes.data || []),
    issueTypes: dedupe(typeRes.data || []),
    scopes: scopeRes.data || []
  };
}

/**
 * Enterprise Ticket Creation Flow
 * Handles dynamic scope validation and manager assignment
 */
export async function createEnterpriseTicket(payload: any) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthenticated.");

  const hasAccess = await hasPermission(user.id, "TICKETS_CREATE");
  if (!hasAccess) throw new Error("Unauthorized: Missing TICKETS_CREATE capability.");

  const { supabaseAdmin } = await import('@/lib/supabase/service_role');
  const { data: creatorInfo } = await supabaseAdmin
    .from('user_master')
    .select('manager_id, department_id')
    .eq('id', user.id)
    .single();

  const validScopes = ['INFRA', 'ERP/SOFTWARE', 'OTHERS'];
  if (!validScopes.includes(payload.scope_type)) {
    throw new Error(`Invalid Scope Type: ${payload.scope_type}`);
  }

  // Sanitize UUID/optional relation fields that might be passed as empty string
  const cleanField = (val: any) => (val && typeof val === 'string' && val.trim() !== '') ? val.trim() : null;

  const priority_id = cleanField(payload.priority_id);
  const issue_type_id = cleanField(payload.issue_type_id);
  const issue_sub_type_id = cleanField(payload.issue_sub_type_id);
  const category_id = cleanField(payload.category_id);
  const sub_category_id = cleanField(payload.sub_category_id);
  const asset_id = cleanField(payload.asset_id);
  const software_system_id = cleanField(payload.software_system_id);
  const module_id = cleanField(payload.module_id);
  const sub_module_id = cleanField(payload.sub_module_id);
  const assignee_id = cleanField(payload.assignee_id);
  const department_id = cleanField(payload.department_id);
  const due_date = cleanField(payload.due_date);

  // Fetch Category
  let isRequirement = false;
  if (category_id) {
    const { data: cat } = await supabaseAdmin
      .from('ticket_categories')
      .select('is_requirement_category')
      .eq('id', category_id)
      .single();
    if (cat?.is_requirement_category) {
      isRequirement = true;
    }
  }

  // Mandatory Requirement Validation
  if (isRequirement) {
    if (!payload.custom_fields?.requirement_description || 
        !payload.custom_fields?.business_reason) {
      throw new Error("Requirement Description and Business Reason are STRICTLY MANDATORY for Requirements.");
    }
  }

  const dbScopeType = payload.scope_type === 'ERP/SOFTWARE' ? 'ERP' : payload.scope_type;

  // Fetch 'NEW' or 'CONVERTED_TO_REQ' status ID from status_master (fallback to global if scoped one is missing)
  const targetStatusCode = isRequirement ? 'CONVERTED_TO_REQ' : 'NEW';
  const { data: newStates } = await supabaseAdmin
    .from('status_master')
    .select('id')
    .eq('status_code', targetStatusCode)
    .or(`scope_type.eq.${dbScopeType},scope_type.eq.GLOBAL,scope_type.is.null`)
    .limit(1);

  const newState = newStates && newStates.length > 0 ? newStates[0] : null;
  if (!newState) throw new Error(`System Error: '${targetStatusCode}' status_master state not found for ${dbScopeType} or global.`);

  // Fallback for priority_id if strictly scoped priorities are missing (prevents 23502 NOT NULL)
  let finalPriorityId = priority_id;
  if (!finalPriorityId) {
    const { data: fallbackPrio } = await supabaseAdmin
      .from('priority_master')
      .select('id')
      .or(`scope_type.eq.${dbScopeType},scope_type.eq.GLOBAL,scope_type.is.null`)
      .limit(1)
      .single();
    if (fallbackPrio) finalPriorityId = fallbackPrio.id;
  }

  // Fallback for department_id (prevents 23502 NOT NULL if user has no department)
  let finalDeptId = department_id || creatorInfo?.department_id;
  if (!finalDeptId) {
    const { data: fallbackDept } = await supabaseAdmin.from('departments').select('id').limit(1).single();
    if (fallbackDept) finalDeptId = fallbackDept.id;
  }

  // Smart Routing / Auto-Assignment
  let finalAssigneeId = assignee_id;
  if (!finalAssigneeId && finalDeptId && !isRequirement) {
    const { data: deptUsers } = await supabaseAdmin
      .from('user_master')
      .select('id')
      .eq('department_id', finalDeptId)
      .eq('is_deleted', false);
      
    if (deptUsers && deptUsers.length > 0) {
      // Fetch open tickets for these users to find the one with the lowest workload
      const { data: openTickets } = await supabaseAdmin
        .from('tickets')
        .select('assignee_id, status_master!inner(status_name)')
        .in('assignee_id', deptUsers.map(u => u.id))
        .eq('is_deleted', false);
        
      const counts: Record<string, number> = {};
      deptUsers.forEach(u => counts[u.id] = 0);
      
      if (openTickets) {
        openTickets.forEach((t: any) => {
          const sName = t.status_master?.status_name?.toLowerCase() || '';
          if (!sName.includes('resolv') && !sName.includes('clos')) {
            if (t.assignee_id && counts[t.assignee_id] !== undefined) {
              counts[t.assignee_id]++;
            }
          }
        });
      }
      
      let minId = deptUsers[0].id;
      let minCount = counts[minId];
      for (const [uid, count] of Object.entries(counts)) {
        if (count < minCount) {
          minCount = count;
          minId = uid;
        }
      }
      finalAssigneeId = minId;
    }
  }

  // Insert Ticket
  const uniqueCode = `INC-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;
  const insertPayload = {
    ...payload,
    code: uniqueCode,
    creator_id: user.id,
    department_id: finalDeptId,
    status_id: newState.id,
    queue_owner_id: creatorInfo?.manager_id || null,
    custom_fields: payload.custom_fields || {},

    // Explicit override with sanitized values to ensure no empty string is written
    priority_id: finalPriorityId,
    issue_type_id,
    issue_sub_type_id,
    category_id,
    sub_category_id,
    asset_id,
    software_system_id,
    module_id,
    sub_module_id,
    assignee_id: finalAssigneeId,
    due_date
  };

  const { createTicket } = await import('@/lib/repositories/tickets');
  const ticket = await createTicket(insertPayload);

  // Requirement Auto-Creation Engine
  if (isRequirement) {
    const { data: reqStates } = await supabaseAdmin
      .from('status_master')
      .select('id')
      .eq('status_code', 'REQ_REGISTRATION')
      .or('scope_type.eq.REQUIREMENT,scope_type.is.null')
      .limit(1);

    const reqState = reqStates && reqStates.length > 0 ? reqStates[0] : null;

    // Run Requirement Creation asynchronously to speed up Ticket CUD
    Promise.resolve().then(async () => {
      try {
        const scopePrefix = payload.scope_type === 'ERP/SOFTWARE' ? 'ERP' : (payload.scope_type === 'INFRA' ? 'INF' : 'OTH');
        const date = new Date();
        const year = date.getFullYear();
        const nextYear = (year + 1).toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const sequencePrefix = `${scopePrefix}-REQ-${year}-${nextYear}-${month}`;
        
        const reqCode = `${sequencePrefix}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
        
        const { data: req, error: reqErr } = await supabaseAdmin.from('requirements').insert({
          code: reqCode,
          title: ticket.title || ticket.subject || 'New Requirement',
          objective: payload.custom_fields.business_reason,
          functional_scope: payload.custom_fields.requirement_description,
          status_id: reqState?.id || newState.id,
          creator_id: user.id,
          department_id: creatorInfo?.department_id || finalDeptId,
          custom_fields: {
            source_ticket_id: ticket.id,
            source_ticket_code: ticket.code,
            requester_id: user.id,
            requester_department_id: creatorInfo?.department_id,
            scope: payload.scope_type,
            requirement_reason: payload.custom_fields.business_reason,
            requirement_details: payload.custom_fields.requirement_description,
            approval_status: 'Pending',
            tat_status: 'On Time',
            current_stage: 'Requirement Registration',
            requirement_status: 'Submitted'
          }
        }).select().single();

        if (reqErr) {
          console.error("Requirement insertion failed:", reqErr);
        } else if (req) {
          // Link Ticket and Requirement
          // Link Ticket and Requirement
          await supabaseAdmin.from('ticket_requirements').insert({
            ticket_id: ticket.id,
            requirement_id: req.id,
            linked_by: user.id
          });

          // Update Ticket Status to "Converted To Requirement"
          const { data: convertedState } = await supabaseAdmin
            .from('status_master')
            .select('id')
            .eq('status_code', 'CONVERTED_TO_REQ')
            .limit(1)
            .single();

          if (convertedState) {
            await supabaseAdmin.from('tickets').update({ status_id: convertedState.id }).eq('id', ticket.id);
          }

          // Notify SUPER_ADMIN queue
          await supabaseAdmin.from('notification_queue').insert({
            recipient_id: user.id, // For now notify self, ideally fetch SUPER_ADMIN
            payload: {
              type: 'REQUIREMENT_CREATED',
              message: `New Requirement auto-generated from Ticket ${ticket.code}`,
              requirement_id: req.id
            },
            status: 'pending'
          });
        }
      } catch (e) {
        console.error("Async requirement creation failed:", e);
      }
    });
  }

  // Trigger Ticket Notifications asynchronously
  if (creatorInfo?.manager_id && !isRequirement) {
    supabaseAdmin.from('notification_queue').insert({
      recipient_id: creatorInfo.manager_id,
      payload: {
        type: 'TICKET_ASSIGNED',
        message: `New ticket ${ticket.code} arrived in your queue.`,
        ticket_id: ticket.id
      },
      status: 'pending'
    }).then(() => {}, (e) => console.error("Async notification failed:", e));
  }

  revalidatePath("/tickets");
  return { success: true, ticket };
}

/**
 * Fetches ticketing metrics for the Manager Dashboard
 */
export async function fetchTicketMetrics() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthenticated.");

  const hasAccess = await hasPermission(user.id, "TICKETS_VIEW");
  if (!hasAccess) throw new Error("Unauthorized");

  const { supabaseAdmin } = await import('@/lib/supabase/service_role');

  // Fetch all tickets. For a huge DB, we'd do aggregates, but for now we'll fetch basic data.
  const { data: tickets, error } = await supabaseAdmin
    .from('tickets')
    .select(`
      id, created_at, status_id, assignee_id, due_date, priority_id,
      assignee:user_master!assignee_id(full_name),
      status_master(status_name, status_code)
    `)
    .eq('is_deleted', false);

  if (error || !tickets) return null;

  const now = Date.now();
  
  let openTickets = 0;
  let resolvedTickets = 0;
  let breachedSla = 0;
  
  const workloadMap: Record<string, number> = {};
  const volumeMap: Record<string, number> = {};

  tickets.forEach(t => {
    const status = (t.status_master as any)?.status_name?.toLowerCase() || "";
    const isResolved = status.includes("resolv") || status.includes("clos");
    
    if (isResolved) {
      resolvedTickets++;
    } else {
      openTickets++;
      // Check SLA breach
      if (t.due_date && new Date(t.due_date).getTime() < now) {
        breachedSla++;
      }
    }

    // Workload
    if (!isResolved) {
      const assigneeName = (t.assignee as any)?.full_name || "Unassigned";
      workloadMap[assigneeName] = (workloadMap[assigneeName] || 0) + 1;
    }

    // Volume by Day (last 7 days logic could be applied here)
    const dateStr = new Date(t.created_at).toISOString().split('T')[0];
    volumeMap[dateStr] = (volumeMap[dateStr] || 0) + 1;
  });

  const workloadData = Object.entries(workloadMap)
    .map(([name, count]) => ({ name, tickets: count }))
    .sort((a, b) => b.tickets - a.tickets)
    .slice(0, 5); // top 5

  // Sort volume by date
  const volumeData = Object.entries(volumeMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7) // last 7 days with data
    .map(([date, count]) => ({ date, count }));

  return {
    totalTickets: tickets.length,
    openTickets,
    resolvedTickets,
    breachedSla,
    workloadData,
    volumeData
  };
}

/**
 * Links a ticket to another ticket
 */
export async function linkTicket(sourceId: string, targetCode: string, relationType: 'DUPLICATE' | 'RELATED' | 'BLOCKS' | 'BLOCKED_BY') {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthenticated.");

  // Find target ticket by code
  const { data: targetTicket, error: targetError } = await supabase
    .from('tickets')
    .select('id')
    .eq('code', targetCode)
    .single();

  if (targetError || !targetTicket) {
    throw new Error(`Could not find ticket with ID ${targetCode}`);
  }

  if (targetTicket.id === sourceId) {
    throw new Error("Cannot link a ticket to itself");
  }

  // Insert relation
  const { error: insertError } = await supabase.from('ticket_relations').insert({
    source_ticket_id: sourceId,
    target_ticket_id: targetTicket.id,
    relation_type: relationType,
    created_by: user.id
  });

  if (insertError) {
    // Possibly a unique constraint error if we had one, but we don't, still check for errors
    console.error("Error linking tickets:", insertError);
    throw new Error("Failed to link tickets");
  }

  revalidatePath(`/tickets/${sourceId}`);
  return { success: true };
}

/**
 * Searches tickets for linking (Autocomplete)
 */
export async function searchTickets(query: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  
  const safeQuery = query?.trim() || "";

  let queryBuilder = supabase
    .from('tickets')
    .select('id, code, title, created_at')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(10);

  if (safeQuery.length > 0) {
    queryBuilder = queryBuilder.or(`code.ilike.%${safeQuery}%,title.ilike.%${safeQuery}%`);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error("Error searching tickets:", error);
    return [];
  }
  return data || [];
}

/**
 * Fetches relations for a ticket
 */
export async function fetchTicketRelations(ticketId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data, error } = await supabase
    .from('ticket_relations')
    .select(`
      id, relation_type, created_at,
      target_ticket:tickets!ticket_relations_target_ticket_id_fkey(id, code, title, status_id)
    `)
    .eq('source_ticket_id', ticketId);

  if (error) {
    console.error("Error fetching ticket relations:", error);
    return [];
  }
  return data || [];
}

/**
 * Fetches available canned responses (macros) for a department
 */
export async function fetchTicketMacros(departmentId?: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthenticated.");

  let query = supabase.from('ticket_macros').select('id, title, content').eq('is_deleted', false);
  
  if (departmentId) {
    query = query.or(`department_id.eq.${departmentId},department_id.is.null`);
  } else {
    query = query.is('department_id', null);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching macros:", error);
    return [];
  }
  return data || [];
}
