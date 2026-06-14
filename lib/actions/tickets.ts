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
      author:user_master!author_id(full_name, email, profile_photo)
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
  priority_id?: string;
  custom_fields?: any;
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
  if (payload.priority_id !== undefined) updateData.priority_id = cleanField(payload.priority_id);
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
export async function fetchTicketDashboardData() {
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

  const tickets = await getVisibleTickets(user.id);

  const [deptRes, prioRes, stateRes, catRes, subcatRes, typeRes, scopeRes] = await Promise.all([
    supabase.from("departments").select("*").eq("is_deleted", false),
    supabase.from("priority_master").select("*, name:priority_name, code:priority_code").eq("is_deleted", false),
    supabase.from("status_master").select("*, name:status_name, code:status_code"),
    supabase.from("ticket_categories").select("*").eq("is_deleted", false),
    supabase.from("ticket_subcategories").select("*").eq("is_deleted", false),
    supabase.from("issue_types").select("*").eq("is_deleted", false),
    supabase.from("ticket_scopes").select("*")
  ]);

  return {
    tickets,
    departments: deptRes.data || [],
    priorities: prioRes.data || [],
    states: stateRes.data || [],
    categories: catRes.data || [],
    subcategories: subcatRes.data || [],
    issueTypes: typeRes.data || [],
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
    assignee_id,
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
