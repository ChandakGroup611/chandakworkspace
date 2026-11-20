"use server";

import { createClient as createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { hasPermission } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { logActivityEvent } from "@/lib/actions/tasks";

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

  const { canAccessTicket } = await import("@/lib/permissions");
  if (!(await canAccessTicket(user.id, ticketId))) {
    throw new Error("Unauthorized: You do not have access to this ticket.");
  }

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

/**
 * Generic Collaboration Action
 * For chats, attachments, and messages.
 */
export async function saveCollaborationEntity(tableName: string, payload: any, editId?: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "Unauthenticated." };

  let res;
  if (editId) {
    res = await supabaseAdmin.from(tableName).update(payload).eq("id", editId).select().single();
  } else {
    const safePayload = {
      ...payload,
      user_id: payload.user_id || user.id
    };
    res = await supabaseAdmin.from(tableName).insert([safePayload]).select().single();
  }

  if (res.error) {
    console.error(`[saveCollaborationEntity] Error in ${tableName}:`, res.error);
    return { success: false, error: res.error.message };
  }
  return { success: true, data: res.data };
}

export async function deleteCollaborationEntity(tableName: string, id: string, hardDelete = false) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "Unauthenticated." };

  let res;
  if (hardDelete) {
    res = await supabaseAdmin.from(tableName).delete().eq("id", id);
  } else {
    res = await supabaseAdmin.from(tableName).update({ is_deleted: true }).eq("id", id);
  }

  if (res.error) {
    console.error(`[deleteCollaborationEntity] Error in ${tableName}:`, res.error);
    return { success: false, error: res.error.message };
  }
  return { success: true };
}
