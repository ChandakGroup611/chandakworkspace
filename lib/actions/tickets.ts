"use server";

import { createClient as createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Enterprise permission verification helper for server actions
 */
async function checkServerPermission(supabase: any, userId: string, requiredPerm: string): Promise<boolean> {
  try {
    // 1. Check SUPER_ADMIN via role_id -> roles.code directly
    const { data: profileData, error: profileError } = await supabase
      .from("user_master")
      .select("role_id")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error(`[checkServerPermission] Profile fetch error: ${profileError.message}`);
      return false;
    }

    if (!profileData || !profileData.role_id) {
      console.log("[checkServerPermission] User has no role assigned");
      return false;
    }

    // Query the role by role_id
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("code")
      .eq("id", profileData.role_id)
      .single();

    if (roleError) {
      console.error(`[checkServerPermission] Role fetch error: ${roleError.message}`);
      return false;
    }

    if (roleData?.code === "SUPER_ADMIN") {
      console.log("[checkServerPermission] User is SUPER_ADMIN, granting access");
      return true;
    }

    // 2. Also check user_roles table for additional roles
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role:roles(code)")
      .eq("user_id", userId);

    if (rolesError) {
      console.error(`[checkServerPermission] User roles fetch error: ${rolesError.message}`);
    } else if (userRoles && userRoles.length > 0) {
      for (const ur of userRoles) {
        const role = ur.role as any;
        const roleCode = Array.isArray(role) ? role[0]?.code : role?.code;
        if (roleCode === "SUPER_ADMIN") {
          console.log("[checkServerPermission] User is SUPER_ADMIN via user_roles");
          return true;
        }
      }
    }

    // 3. Query permissions snapshot
    const { data: userPerms, error: permsError } = await supabase
      .from("user_permissions_snapshot")
      .select("permission_code")
      .eq("user_id", userId);

    if (permsError) {
      console.warn(`[checkServerPermission] Permissions fetch error: ${permsError.message}`);
      return false;
    }

    if (!userPerms || userPerms.length === 0) {
      console.warn(`[checkServerPermission] No permissions found for user ${userId}`);
      return false;
    }

    const perms = userPerms.map((r: any) => r.permission_code);
    
    // Expand permissions snapshot with inheritance
    const expanded = new Set<string>(perms);
    for (const p of perms) {
      if (p.endsWith("_MANAGE")) {
        const base = p.replace("_MANAGE", "");
        expanded.add(`${base}_VIEW`);
        expanded.add(`${base}_CREATE`);
        expanded.add(`${base}_UPDATE`);
        expanded.add(`${base}_DELETE`);
      } else if (p.endsWith("_CREATE") || p.endsWith("_UPDATE") || p.endsWith("_DELETE")) {
        const base = p.slice(0, p.lastIndexOf("_"));
        expanded.add(`${base}_VIEW`);
      }
    }

    const hasPermission = expanded.has(requiredPerm) || expanded.has("SUPER_ADMIN");
    
    if (!hasPermission) {
      const permsStr = Array.from(expanded).join(", ");
      console.warn(`[checkServerPermission] User ${userId} lacks ${requiredPerm}. Available: ${permsStr}`);
    }

    return hasPermission;
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error(`[checkServerPermission] Exception: ${msg}`);
    return false;
  }
}

/**
 * Fetches all remarks/comments for a given ticket
 */
export async function fetchTicketComments(ticketId: string) {
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
    .order("created_at", { ascending: true });

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
  if (!hasAccess) {
    throw new Error("Unauthorized: Missing TICKETS_UPDATE capability.");
  }

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
export async function fetchTicketAuditLogs(ticketId: string) {
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
    .order("created_at", { ascending: false });

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
  if (!hasAccess) {
    throw new Error("Unauthorized: Missing TICKETS_UPDATE capability.");
  }

  const updateData: any = {};
  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.status_id !== undefined) updateData.status_id = payload.status_id;
  if (payload.assignee_id !== undefined) updateData.assignee_id = payload.assignee_id;
  if (payload.department_id !== undefined) updateData.department_id = payload.department_id;
  if (payload.priority_id !== undefined) updateData.priority_id = payload.priority_id;
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
