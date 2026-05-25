"use server";

import { createClient as createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { hasPermission } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { logActivityEvent } from "@/lib/actions/tasks";

/**
 * Extracts mentions (@username) from text
 */
function extractMentions(text: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map(m => m.substring(1)) : [];
}

/**
 * Adds an operational remark/comment to a ticket and processes mentions
 */
export async function addTicketRemark(ticketId: string, content: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthenticated.");

  const hasAccess = await hasPermission(user.id, "TICKETS_UPDATE");
  if (!hasAccess) throw new Error("Unauthorized: Missing TICKETS_UPDATE capability.");

  // Insert remark
  const { data: remark, error } = await supabaseAdmin
    .from("ticket_comments")
    .insert({
      ticket_id: ticketId,
      author_id: user.id,
      content: content.trim()
    })
    .select()
    .single();

  if (error) {
    console.error("[Collaboration] Error adding remark:", error);
    throw new Error("Failed to save remark.");
  }

  // Process Mentions
  const mentionedUsernames = extractMentions(content);
  if (mentionedUsernames.length > 0) {
    // Find user IDs for the mentioned usernames
    // Note: Assuming `user_master` has a `username` or `email` field we can match against
    // We'll simulate a query here finding mentioned users
    const { data: users } = await supabaseAdmin
      .from('user_master')
      .select('id, full_name, email')
      .in('email', mentionedUsernames); // Replace with actual username field if exists

    if (users && users.length > 0) {
      const notifications = users.map(u => ({
        recipient_id: u.id,
        payload: {
          type: 'MENTION',
          message: `You were mentioned in a ticket remark`,
          ticket_id: ticketId,
          remark_id: remark.id
        },
        status: 'pending'
      }));

      // Push to Realtime Notification Queue
      await supabaseAdmin.from('notification_queue').insert(notifications);
      
      // Also queue emails
      const emails = users.map(u => ({
        recipient_email: u.email,
        subject: `Mentioned in Ticket ${ticketId}`,
        body_template: `You were mentioned in a ticket remark: "${content}"`,
        status: 'pending'
      }));
      await supabaseAdmin.from('email_queue').insert(emails);
    }
  }

  // Also notify ticket Assignee and Creator
  const { data: ticket } = await supabaseAdmin.from('tickets').select('creator_id, assignee_id').eq('id', ticketId).single();
  if (ticket) {
    const notifyIds = new Set([ticket.creator_id, ticket.assignee_id].filter(Boolean));
    notifyIds.delete(user.id); // Don't notify self
    
    if (notifyIds.size > 0) {
      const updates = Array.from(notifyIds).map(id => ({
        recipient_id: id,
        payload: {
          type: 'REMARK_ADDED',
          message: `New remark added to your ticket`,
          ticket_id: ticketId
        },
        status: 'pending'
      }));
      await supabaseAdmin.from('notification_queue').insert(updates);
    }
  }

  // Centralized Activity Event Logging
  await logActivityEvent('TICKET', ticketId, 'COMMENT', null, { content }, user.id);

  return { success: true, remark };
}

/**
 * Adds a live chat message to a ticket
 */
export async function addTicketChatMessage(ticketId: string, content: string, attachments?: string[]) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthenticated.");

  const hasAccess = await hasPermission(user.id, "TICKETS_VIEW"); // Assuming VIEW is enough to chat
  if (!hasAccess) throw new Error("Unauthorized.");

  const payload: any = {
    ticket_id: ticketId,
    sender_id: user.id,
    message: content.trim()
  };

  if (attachments && attachments.length > 0) {
    payload.attachments = attachments; // JSON array of attachment IDs
  }

  const { data: message, error } = await supabaseAdmin
    .from("ticket_chats") // Adjust table name if needed based on schema
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("[Collaboration] Error adding chat message:", error);
    throw new Error("Failed to save chat message.");
  }

  // Centralized Activity Event Logging
  await logActivityEvent('TICKET', ticketId, 'CHAT', null, { content }, user.id);

  return { success: true, message };
}
