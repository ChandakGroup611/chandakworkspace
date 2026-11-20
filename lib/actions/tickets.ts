"use server";

import { createClient as createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { queueBusinessEvent } from "@/lib/actions/notification-engine";
import { todayIST, toISTDateString, isOverdue } from "@/lib/utils/date-utils";

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

  const { canAccessTicket } = await import("@/lib/permissions");
  if (!(await canAccessTicket(user.id, ticketId))) {
    throw new Error("Unauthorized: You do not have access to this ticket.");
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

  const { canAccessTicket } = await import("@/lib/permissions");
  if (!(await canAccessTicket(user.id, ticketId))) {
    throw new Error("Unauthorized: You do not have access to this ticket.");
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
 * Item 3.4: Single-function status transition pattern for tickets matching changeTaskStatus
 */
export async function changeTicketStatus(
  ticketId: string,
  targetStatusIdOrCode: string,
  remark?: string,
  actorIdOverride?: string
): Promise<{ success: boolean; data?: { status_id: string; status_name: string }; error?: string }> {
  let userId: string | null = null;
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  } catch {
    // Background scripts or test execution context
  }

  if (!userId) {
    if (process.env.NODE_ENV !== "production") {
      userId = actorIdOverride || null;
    }
  }

  if (!userId) return { success: false, error: "Unauthenticated" };

  const { supabaseAdmin } = await import('@/lib/supabase/service_role');

  // Fetch ticket details
  const { data: ticket, error: fetchErr } = await supabaseAdmin
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .single();

  if (fetchErr || !ticket) return { success: false, error: "Ticket not found" };

  // Validate the target status: active, not deleted, not a Task/Requirement status, and preferably the
  // ticket's own scope (statuses are defined per ticket scope in Master data). The earlier check required
  // status_master.scope_type to be 'INFRA'/'ERP'/'GLOBAL', which ticket statuses don't use, so every
  // status change on save was rejected.
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let targetQuery = supabaseAdmin
    .from('status_master')
    .select('*')
    .eq('is_deleted', false);

  if (uuidRegex.test(targetStatusIdOrCode)) {
    targetQuery = targetQuery.eq('id', targetStatusIdOrCode);
  } else {
    targetQuery = targetQuery.eq('status_code', targetStatusIdOrCode.toUpperCase());
  }

  const NON_TICKET_SCOPES = ['TASK', 'TASKS', 'REQUIREMENT', 'REQUIREMENTS', 'WORKSPACE', 'WORKSPACES'];
  const { data: candidates } = await targetQuery.limit(25);
  const usable = (candidates || []).filter((s: any) =>
    s.is_active !== false && !NON_TICKET_SCOPES.includes(String(s.scope_type || '').toUpperCase())
  );
  const targetStatus: any =
    usable.find((s: any) => ticket.scope_id && s.scope_id === ticket.scope_id) ||
    usable.find((s: any) => !s.scope_id) ||
    usable[0];
  if (!targetStatus) {
    return { success: false, error: `This status can't be used for tickets (it is inactive, deleted, or belongs to another module).` };
  }

  // Permission checks: Super Admin, Creator, Assignee, Queue Owner, or TICKETS_UPDATE capability
  const { hasPermission, canAccessTicket } = await import('@/lib/permissions');
  const isSuperAdmin = await hasPermission(userId, "SUPER_ADMIN");
  const isOwnerOrAssignee = ticket.creator_id === userId || ticket.assignee_id === userId || ticket.queue_owner_id === userId;
  const canAccess = await canAccessTicket(userId, ticketId);

  if (!isSuperAdmin && !isOwnerOrAssignee && !canAccess) {
    return { success: false, error: "Unauthorized: You do not have permission to transition this ticket status." };
  }

  // Fetch old status name for logging
  let oldName = "Unknown";
  if (ticket.status_id) {
    const { data: oldS } = await supabaseAdmin.from('status_master').select('status_name').eq('id', ticket.status_id).maybeSingle();
    if (oldS?.status_name) oldName = oldS.status_name;
  }
  const newName = targetStatus.status_name;

  // Update ticket status
  const updatePayload: Record<string, any> = {
    status_id: targetStatus.id,
    updated_at: new Date().toISOString()
  };

  const { error: updateError } = await supabaseAdmin
    .from('tickets')
    .update(updatePayload)
    .eq('id', ticketId);

  if (updateError) {
    return { success: false, error: updateError.message || JSON.stringify(updateError) };
  }

  // Side effect 1: Add remark comment if provided
  if (remark && remark.trim().length > 0) {
    await supabaseAdmin
      .from('ticket_comments')
      .insert([{ ticket_id: ticketId, author_id: userId, content: remark.trim() }]);
  }

  // Side effect 2: Insert audit log
  await supabaseAdmin
    .from('ticket_audit_logs')
    .insert([{
      ticket_id: ticketId,
      actor_id: userId,
      operation: 'STATUS_CHANGE',
      before_values: { status_id: ticket.status_id, status_name: oldName },
      after_values: { status_id: targetStatus.id, status_name: newName, remark: remark || null },
      created_at: new Date().toISOString()
    }]);

  // Side effect 3: Notification queue push and business event with human names old -> new (Item 4.6)
  const isClosedOrTerminal = targetStatus.is_closed || targetStatus.is_terminal;
  const statusTransitionDisplay = `${oldName} → ${newName}`;

  if (ticket.creator_id && ticket.creator_id !== userId) {
    await supabaseAdmin.from('notification_queue').insert([{
      recipient_id: ticket.creator_id,
      payload: {
        type: isClosedOrTerminal ? 'TICKET_RESOLVED' : 'TICKET_STATUS_CHANGED',
        message: `Ticket ${ticket.code} status changed from ${oldName} to ${newName}.`,
        ticket_id: ticketId,
        old_status: oldName,
        new_status: newName,
        status_transition: statusTransitionDisplay
      },
      is_read: false
    }]);
  }

  queueBusinessEvent("Ticket", "Status Changed", {
    entity_id: ticketId,
    triggering_user_id: userId,
    status: targetStatus.id,
    status_name: newName,
    status_transition: statusTransitionDisplay,
    old_status: oldName,
    new_status: newName,
    ticket_code: ticket.code,
    ticket_title: ticket.title || ticket.code,
    assigned_to: ticket.assignee_id,
    created_by: ticket.creator_id,
    department_id: ticket.department_id,
    remarks: remark || "",
    link: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://chandakgroup.tech'}/tickets/${ticketId}`
  }).catch(e => console.error("[NotificationEngine] Ticket status change queue push failed", e));

  // Revalidate cache
  try {
    revalidatePath("/tickets");
    revalidatePath(`/tickets/${ticketId}`);
  } catch {}

  return { success: true, data: { status_id: targetStatus.id, status_name: newName } };
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

  const { supabaseAdmin } = await import('@/lib/supabase/service_role');
  const { data: existingTicket } = await supabaseAdmin
    .from("tickets")
    .select("*")
    .eq("id", ticketId)
    .eq("is_deleted", false)
    .maybeSingle();
  if (!existingTicket) {
    throw new Error("Ticket not found or already deleted.");
  }

  // Who may edit: Super Admin, ticket managers / TICKETS_UPDATE, or the ticket's creator, assignee or queue owner.
  const canEdit =
    (await checkServerPermission(supabase, user.id, "SUPER_ADMIN")) ||
    (await checkServerPermission(supabase, user.id, "TICKETS_MANAGE")) ||
    (await checkServerPermission(supabase, user.id, "TICKETS_UPDATE")) ||
    existingTicket.creator_id === user.id ||
    existingTicket.assignee_id === user.id ||
    existingTicket.queue_owner_id === user.id;
  if (!canEdit) {
    throw new Error("You don't have permission to update this ticket.");
  }

  // Route status changes through changeTicketStatus (Item 3.4)
  if (payload.status_id !== undefined && payload.status_id) {
    const statusRes = await changeTicketStatus(ticketId, payload.status_id, payload.remark, user.id);
    if (statusRes && !statusRes.success) {
      throw new Error(`Failed to update ticket status: ${statusRes.error}`);
    }
  }

  const cleanField = (val: any) => (val && typeof val === 'string' && val.trim() !== '') ? val.trim() : null;

  const updateData: any = {};
  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.assignee_id !== undefined) updateData.assignee_id = cleanField(payload.assignee_id);
  if (payload.department_id !== undefined) updateData.department_id = cleanField(payload.department_id);
  if (payload.category_id !== undefined) updateData.category_id = cleanField(payload.category_id);
  if (payload.sub_category_id !== undefined) updateData.sub_category_id = cleanField(payload.sub_category_id);
  if (payload.issue_type_id !== undefined) updateData.issue_type_id = cleanField(payload.issue_type_id);
  if (payload.priority_id !== undefined) {
    const cleanedPrio = cleanField(payload.priority_id);
    if (!cleanedPrio) {
      throw new Error("Operational Priority cannot be cleared. Priority selection is mandatory.");
    }
    updateData.priority_id = cleanedPrio;
  }
  if (payload.due_date !== undefined) updateData.due_date = payload.due_date ? new Date(payload.due_date).toISOString() : null;
  if (payload.custom_fields !== undefined) updateData.custom_fields = payload.custom_fields;

  let updatedTicket: any = null;
  if (Object.keys(updateData).length > 0) {
    updateData.updated_at = new Date().toISOString();

    // Permission is checked above; write with the service role so row-level policies on the user's
    // session can't silently reject the save.
    const { data, error } = await supabaseAdmin
      .from("tickets")
      .update(updateData)
      .eq("id", ticketId)
      .select()
      .single();

    if (error) {
      console.error("[Server Action] Error updating ticket details:", error);
      throw new Error(`Failed to update ticket: ${error.message}`);
    }
    updatedTicket = data;
  } else {
    const { data } = await supabaseAdmin.from("tickets").select().eq("id", ticketId).single();
    updatedTicket = data;
  }

  // Insert remark if provided (when status was not updated)
  if (!payload.status_id && payload.remark && payload.remark.trim() !== '') {
    const { error: remarkError } = await supabaseAdmin
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

  // Notifications for assignment change (only when the assignee really changed)
  const newAssigneeId = updatedTicket?.assignee_id || null;
  const assigneeChanged = payload.assignee_id !== undefined && newAssigneeId && newAssigneeId !== existingTicket.assignee_id;
  if (updatedTicket && assigneeChanged) {
    queueBusinessEvent("Ticket", "Assigned", {
      entity_id: updatedTicket.id,
      triggering_user_id: user.id,
      assigned_to: newAssigneeId,
      ticket_code: updatedTicket.code,
      ticket_title: updatedTicket.title || updatedTicket.code,
      remarks: payload.remark || "",
      link: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://chandakgroup.tech'}/tickets/${updatedTicket.id}`
    }).catch((e: any) => console.error("[NotificationEngine] Ticket reassignment event failed", e));
  }
  if (updatedTicket && assigneeChanged && newAssigneeId !== user.id) {
    await supabaseAdmin.from('notification_queue').insert({
      recipient_id: payload.assignee_id,
      payload: {
        type: 'TICKET_ASSIGNED',
        message: `Ticket ${updatedTicket.code} has been assigned to you.`,
        ticket_id: updatedTicket.id
      },
      is_read: false
    });
  }

  revalidatePath("/tickets");
  return { success: true, ticket: updatedTicket };
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
  const { generateTeamsMeetingLink: genTeams } = await import("@/lib/integrations/microsoft-teams");
  const threadId = "MTG-" + Math.random().toString(36).substring(2, 10).toUpperCase();
  const mockTeamsLink = await genTeams({
    title: `Ticket ${ticket.code}: ${ticket.title}`,
    organizerEmail: user.email,
    attendeeEmails: user.email ? [user.email] : [],
    callType: "call",
  });

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
 * Masters are read fresh on every call; tickets via the visibility-scoped repository query
 */
export async function fetchTicketDashboardData(filters?: { searchQuery?: string, status_id?: string, priority_id?: string, scope_id?: string, scope_type?: string }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthenticated. Please log in first.");
  }

  const { getVisibleTickets } = await import('@/lib/repositories/tickets');
  const { supabaseAdmin } = await import('@/lib/supabase/service_role');

  const ticketsPromise = getVisibleTickets(user.id, undefined, filters).catch((err) => {
    console.error("[fetchTicketDashboardData] getVisibleTickets error:", err);
    return [];
  });

  let scopeId: string | null | undefined = filters?.scope_id !== "ALL" ? filters?.scope_id : null;

  // Masters are read fresh on every call (no in-memory cache): a status, priority or category saved in
  // Master data must show in Tickets immediately. Filter by scope first; de-duplicate by code only when no
  // scope is selected (de-duplicating first dropped the other scopes' entries that share a code).
  const [deptRes, prioRes, stateRes, catRes, subcatRes, typeRes, scopeRes] = await Promise.all([
    supabaseAdmin.from("departments").select("*").eq("is_deleted", false),
    supabaseAdmin.from("priority_master").select("*, name:priority_name, code:priority_code").eq("is_deleted", false),
    supabaseAdmin.from("status_master").select("*, name:status_name, code:status_code"),
    supabaseAdmin.from("ticket_categories").select("*").eq("is_deleted", false),
    supabaseAdmin.from("ticket_subcategories").select("*").eq("is_deleted", false),
    supabaseAdmin.from("issue_types").select("*").eq("is_deleted", false),
    supabaseAdmin.from("ticket_scopes").select("*")
  ]);

  const ticketScopeIds = new Set((scopeRes.data || []).map((s: any) => s.id));
  // A ticket stores its scope as a code (scope_type: INFRA / ERP or ERP/SOFTWARE / OTHERS); resolve it
  // to the scope id that the masters use, so a ticket's page shows its own scope's priorities/statuses.
  if (!scopeId && filters?.scope_type) {
    const code = String(filters.scope_type).toUpperCase() === "ERP/SOFTWARE" ? "ERP" : String(filters.scope_type).toUpperCase();
    const match = (scopeRes.data || []).find((s: any) => String(s.code || "").toUpperCase() === code);
    if (match) scopeId = match.id;
  }
  const byScope = (arr: any[] | null, ticketScopesOnly = false) => {
    let list = arr || [];
    if (scopeId) return list.filter((item: any) => item.scope_id === scopeId);
    // Status and priority masters are shared with Tasks and Requirements; keep only rows that belong to a
    // ticket scope (fall back to everything if none are scoped, so the lists are never empty).
    if (ticketScopesOnly) {
      const ticketRows = list.filter((item: any) => item.scope_id && ticketScopeIds.has(item.scope_id));
      if (ticketRows.length > 0) list = ticketRows;
    }
    const seen = new Set();
    return list.filter((item: any) => {
      const code = item.code || item.name;
      if (seen.has(code)) return false;
      seen.add(code);
      return true;
    });
  };

  const metadata = {
    departments: deptRes.data || [],
    scopes: scopeRes.data || []
  };
  const priorities = byScope(prioRes.data, true);
  const states = byScope(stateRes.data, true);
  const categories = byScope(catRes.data);
  const subcategories = byScope(subcatRes.data);
  const issueTypes = byScope(typeRes.data);

  const tickets = await ticketsPromise;

  return {
    tickets: tickets || [],
    departments: metadata.departments || [],
    priorities: priorities || [],
    states: states || [],
    categories: categories || [],
    subcategories: subcategories || [],
    issueTypes: issueTypes || [],
    scopes: metadata.scopes || []
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

  if (!priority_id) {
    throw new Error("Operational Priority is mandatory. Please select a priority.");
  }

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

  const dbScopeType = payload.scope_type === 'ERP/SOFTWARE' ? 'ERP' : (payload.scope_type || 'ERP');

  // Single default status resolution (Item 2.7 / Decision D5)
  let newState: { id: string } | null = null;
  if (isRequirement) {
    const { data: reqStatus } = await supabaseAdmin
      .from('status_master')
      .select('id')
      .eq('status_code', 'CONVERTED_TO_REQ')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .maybeSingle();

    if (!reqStatus) {
      return { error: "Status 'CONVERTED_TO_REQ' is not configured or active." };
    }
    newState = reqStatus;
  } else {
    // Look up the single default status for the ticket's scope
    const { data: defaultStatus } = await supabaseAdmin
      .from('status_master')
      .select('id, is_closed, is_terminal')
      .eq('scope_type', dbScopeType)
      .eq('is_default', true)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .maybeSingle();

    if (defaultStatus && !defaultStatus.is_closed && !defaultStatus.is_terminal) {
      newState = defaultStatus;
    } else {
      // Fallback: search for active initial status by code ('OPEN', 'NEW') strictly in scope
      const { data: namedStatus } = await supabaseAdmin
        .from('status_master')
        .select('id')
        .eq('scope_type', dbScopeType)
        .in('status_code', ['OPEN', 'NEW'])
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('status_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (namedStatus) {
        newState = namedStatus;
      } else {
        return { error: `No active default status configured for scope '${dbScopeType}'.` };
      }
    }
  }

  if (!newState) {
    return { error: `No active status configured for ticket creation under scope '${dbScopeType}'.` };
  }

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
  const statusId = newState?.id || payload.status_id || null;

  const insertPayload = {
    ...payload,
    code: uniqueCode,
    creator_id: user.id,
    department_id: finalDeptId,
    status_id: statusId,
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
          status_id: reqState?.id || statusId,
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
            is_read: false
          });
        }
      } catch (e) {
        console.error("Async requirement creation failed:", e);
      }
    });
  }

  // Trigger Ticket Notifications asynchronously
  Promise.resolve().then(async () => {
    try {
      const { dispatchNotification } = await import('@/lib/actions/notifications');

      // Fire generic 'Created' event
      await queueBusinessEvent("Ticket", "Created", {
        entity_id: ticket.id,
        triggering_user_id: user.id,
        ticket_code: ticket.code,
        ticket_title: ticket.title || ticket.subject || 'Untitled',
        link: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://chandakgroup.tech'}/tickets/${ticket.id}`
      });

      // If there's an assignee, notify them
      if (finalAssigneeId) {
        await dispatchNotification(
          finalAssigneeId,
          'Ticket Assigned',
          `You have been assigned to Ticket ${ticket.code}.`,
          `/tickets/${ticket.id}`,
          'TICKET',
          'ASSIGNED',
          { _disableEmail: true }
        ).catch((e: any) => console.error("In-app notification failed:", e));

        await queueBusinessEvent("Ticket", "Assigned", {
          entity_id: ticket.id,
          triggering_user_id: user.id,
          assigned_to: finalAssigneeId,
          ticket_code: ticket.code,
          ticket_title: ticket.title || ticket.subject || 'Untitled',
          link: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://chandakgroup.tech'}/tickets/${ticket.id}`
        });
      }
      // Or if it went to manager queue
      else if (creatorInfo?.manager_id && !isRequirement) {
        await dispatchNotification(
          creatorInfo.manager_id,
          'Ticket in Queue',
          `New ticket ${ticket.code} arrived in your queue.`,
          `/tickets/${ticket.id}`,
          'TICKET',
          'QUEUED',
          { _disableEmail: true }
        ).catch((e: any) => console.error("In-app notification failed:", e));

        await queueBusinessEvent("Ticket", "Assigned", {
          entity_id: ticket.id,
          triggering_user_id: user.id,
          assigned_to: creatorInfo.manager_id,
          ticket_code: ticket.code,
          ticket_title: ticket.title || ticket.subject || 'Untitled',
          link: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://chandakgroup.tech'}/tickets/${ticket.id}`
        });
      }
    } catch (e) {
      console.error("Async ticket notifications failed:", e);
    }
  });

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
  const isSuperAdmin = await hasPermission(user.id, "SUPER_ADMIN");

  let baseQuery = supabaseAdmin
    .from('tickets')
    .select(`
      id, created_at, status_id, assignee_id, due_date, priority_id,
      assignee:user_master!assignee_id(full_name),
      status_master(status_name, status_code, is_terminal, is_closed)
    `, { count: 'exact' })
    .eq('is_deleted', false);

  if (!isSuperAdmin) {
    let explicitOrFilters = [
      `creator_id.eq.${user.id}`,
      `assignee_id.eq.${user.id}`,
      `queue_owner_id.eq.${user.id}`
    ];
    const { data: subordinates } = await supabaseAdmin
      .from('user_master')
      .select('id')
      .eq('manager_id', user.id)
      .eq('is_deleted', false);

    if (subordinates && subordinates.length > 0) {
      const subIds = subordinates.map(s => s.id).join(',');
      explicitOrFilters.push(`creator_id.in.(${subIds})`);
      explicitOrFilters.push(`assignee_id.in.(${subIds})`);
      explicitOrFilters.push(`queue_owner_id.in.(${subIds})`);
    }

    baseQuery = baseQuery.or(explicitOrFilters.join(','));
  }

  const { data: tickets, count: totalCount, error } = await baseQuery.limit(100);

  if (error || !tickets) return null;

  const now = Date.now();

  let openTickets = 0;
  let resolvedTickets = 0;
  let breachedSla = 0;

  const workloadMap: Record<string, number> = {};
  const volumeMap: Record<string, number> = {};

  tickets.forEach(t => {
    const sm = t.status_master as any;
    const isResolved = sm?.is_closed === true || sm?.is_terminal === true || sm?.status_name?.toLowerCase().includes("resolv") || sm?.status_name?.toLowerCase().includes("clos");

    if (isResolved) {
      resolvedTickets++;
    } else {
      openTickets++;
      if (t.due_date && isOverdue(t.due_date, isResolved)) {
        breachedSla++;
      }
    }

    if (!isResolved) {
      const assigneeName = (t.assignee as any)?.full_name || "Unassigned";
      workloadMap[assigneeName] = (workloadMap[assigneeName] || 0) + 1;
    }

    const dateStr = toISTDateString(t.created_at) || todayIST();
    volumeMap[dateStr] = (volumeMap[dateStr] || 0) + 1;
  });

  const workloadData = Object.entries(workloadMap)
    .map(([name, count]) => ({ name, tickets: count }))
    .sort((a, b) => b.tickets - a.tickets)
    .slice(0, 5);

  const volumeData = Object.entries(volumeMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7)
    .map(([date, count]) => ({ date, count }));

  return {
    totalTickets: totalCount ?? tickets.length,
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

/**
 * Fetches a single ticket directly by ID or Code.
 */
export async function fetchSingleTicketDetails(ticketId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated.");

  const { supabaseAdmin } = await import('@/lib/supabase/service_role');

  const { data, error } = await supabaseAdmin
    .from('tickets')
    .select(`
      *,
      creator:user_master!fk_tickets_creator(full_name, profile_photo),
      assignee:user_master!fk_tickets_assignee(full_name, profile_photo),
      department:departments(name),
      priority:priority_master(priority_name, priority_color),
      status:status_master(status_name, status_color, is_terminal)
    `)
    .eq('is_deleted', false)
    .or(`id.eq.${ticketId},code.eq.${ticketId}`)
    .single();

  if (error || !data) {
    return null;
  }

  // Permission check
  const { hasPermission } = await import('@/lib/permissions');
  const canViewAll = await hasPermission(user.id, 'TICKETS_MANAGE');

  if (!canViewAll) {
    let allowed = data.creator_id === user.id || data.assignee_id === user.id || data.queue_owner_id === user.id;
    if (!allowed) {
      const { data: subordinates } = await supabaseAdmin
        .from('user_master')
        .select('id')
        .eq('manager_id', user.id)
        .eq('is_deleted', false);
      if (subordinates) {
        const subIds = subordinates.map(s => s.id);
        if (subIds.includes(data.creator_id) || subIds.includes(data.assignee_id) || subIds.includes(data.queue_owner_id)) {
          allowed = true;
        }
      }
    }
    if (!allowed) return null;
  }

  return data;
}

export async function deleteTicket(ticketId: string, reason?: string) {
  let userId: string | null = null;
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!authError && user) {
      userId = user.id;
    }
  } catch {
    // Called outside request scope (e.g. test runner)
  }

  if (!userId) {
    return { error: "Unauthenticated. Please log in first." };
  }

  const { hasPermission } = await import('@/lib/permissions');
  const isSuperAdmin = await hasPermission(userId, "SUPER_ADMIN");
  const canDeletePerm = await hasPermission(userId, "TICKETS_DELETE");

  const { supabaseAdmin } = await import('@/lib/supabase/service_role');
  const { data: ticket } = await supabaseAdmin
    .from('tickets')
    .select('id, creator_id, assignee_id, queue_owner_id')
    .eq('id', ticketId)
    .single();

  if (!ticket) return { error: "Ticket not found." };

  const isOwner = ticket.creator_id === userId || ticket.queue_owner_id === userId;
  if (!isSuperAdmin && !canDeletePerm && !isOwner) {
    return { error: "Unauthorized: Only Super Admins, ticket owners, or users with TICKETS_DELETE permission can delete tickets." };
  }

  const { LifecycleManager } = await import('@/lib/services/LifecycleManager');
  const { success, batchId, error: lmError } = await LifecycleManager.moveToTrash('TICKET', ticketId, userId, reason || "User requested ticket deletion");
  if (!success) return { error: lmError || "Failed to delete ticket." };

  revalidatePath('/tickets');
  return { success: true, batchId };
}
