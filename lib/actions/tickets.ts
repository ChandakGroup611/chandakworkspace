"use server";

import { createClient as createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Fetches all remarks/comments for a given ticket
 */
export async function fetchTicketComments(ticketId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

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

  // Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthenticated. Please log in first.");
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

  // Filter out undefined keys to prevent accidental null overwrites
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
 * Displays deep integration blueprint comments on how to connect a live corporate Teams API.
 */
export async function generateTeamsMeetingLink(ticketId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  // 1. Fetch current ticket custom fields
  const { data: ticket, error: fetchError } = await supabase
    .from("tickets")
    .select("id, code, title, custom_fields")
    .eq("id", ticketId)
    .single();

  if (fetchError || !ticket) {
    throw new Error("Ticket not found.");
  }

  // =========================================================================
  // 📘 ENTERPRISE MICROSOFT TEAMS API INTEGRATION MANUAL
  // =========================================================================
  // To connect this with a live corporate Microsoft Teams environment:
  // 
  // Step 1: Azure Active Directory App Registration
  // ------------------------------------------------
  // - Go to Microsoft Entra ID (Azure AD) Portal -> App Registrations -> New Registration.
  // - Name: "ADIOS Ticketing Connector".
  // - Supported Account Types: "Accounts in this organizational directory only".
  //
  // Step 2: Grant Microsoft Graph API Permissions
  // -----------------------------------------------
  // - Go to "API Permissions" -> Add Permission -> "Microsoft Graph".
  // - Select "Application Permissions" (runs in background without user log-in).
  // - Search and check: "OnlineMeetings.ReadWrite.All" (allows creating meetings).
  // - Click "Grant Admin Consent for [Your Organization Name]" (CRITICAL).
  //
  // Step 3: Generate Secret Key
  // ---------------------------
  // - Go to "Certificates & Secrets" -> New Client Secret.
  // - Copy the Secret "Value" (e.g., `sb_secret_abc123...`).
  //
  // Step 4: Code Implementation blueprint:
  // ---------------------------------------
  // const tenantId = process.env.AZURE_TENANT_ID;
  // const clientId = process.env.AZURE_CLIENT_ID;
  // const clientSecret = process.env.AZURE_CLIENT_SECRET;
  // const hostUserId = process.env.AZURE_SYSTEM_ORGANIZER_USER_ID; // UUID of host user
  //
  // // Fetch Access Token
  // const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  //   body: new URLSearchParams({
  //     grant_type: 'client_credentials',
  //     client_id: clientId,
  //     client_secret: clientSecret,
  //     scope: 'https://graph.microsoft.com/.default'
  //   })
  // });
  // const { access_token } = await tokenResponse.json();
  //
  // // Create Live Teams Meeting
  // const meetingResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${hostUserId}/onlineMeetings`, {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${access_token}`,
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({
  //     subject: `ADIOS Ticket Support Sync: [${ticket.code}] ${ticket.title}`,
  //     startDateTime: new Date().toISOString(),
  //     endDateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour duration
  //   })
  // });
  // const meetingData = await meetingResponse.json();
  // const realTeamsLink = meetingData.joinWebUrl; // Real URL created!
  // =========================================================================

  // Generate dynamic unique mock meeting URL for operational use
  const meetingId = "meet-" + Math.random().toString(36).substring(2, 15);
  const threadId = "19:meeting_" + Math.random().toString(36).substring(2, 10) + "thread.v2";
  const mockTeamsLink = `https://teams.microsoft.com/l/meetup-join/${threadId}/0?context=%7b%22Tid%22%3a%22enterprise-internal-tenant-id%22%2c%22Oid%22%3a%22${meetingId}%22%7d`;

  // Merge into custom fields
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

  // Update in database
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
