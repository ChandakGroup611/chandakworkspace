"use server";

import { createClient as createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { dispatchNotification } from "./notifications";

export interface WorkspaceUser {
  id: string;
  full_name: string;
  email: string;
  profile_photo: string | null;
  department_name: string | null;
  designation_name: string | null;
  role_name: string | null;
  is_active: boolean;
  last_login_at?: string | null;
}

export interface MessengerParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  last_read_at: string;
  is_pinned: boolean;
  is_muted: boolean;
  user?: WorkspaceUser;
}

export interface MessengerAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  path?: string;
}

export interface MessengerReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
  user_name?: string;
}

export interface MessengerMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: "text" | "image" | "file" | "voice" | "system" | "task_card" | "meeting_invite";
  reply_to_id: string | null;
  reply_to?: {
    id: string;
    content: string;
    sender_name: string;
    message_type: string;
  } | null;
  attachments: MessengerAttachment[];
  mentions: string[];
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  sender?: WorkspaceUser;
  reactions?: MessengerReaction[];
}

export interface MessengerConversation {
  id: string;
  type: "direct" | "group";
  title: string | null;
  description: string | null;
  avatar_url: string | null;
  created_by: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  last_message_sender_id: string | null;
  direct_user1_id: string | null;
  direct_user2_id: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  participants: MessengerParticipant[];
  unread_count: number;
  other_user?: WorkspaceUser | null;
  is_pinned?: boolean;
}

/** Helper to get current authenticated user or throw error */
async function getAuthUser(): Promise<string> {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Unauthenticated. Please sign in to access Chandak Messenger.");
  }
  return user.id;
}

/**
 * Fetch all active Chandak Workspace users for direct chats & mentions.
 */
export async function fetchWorkspaceUsersForMessenger(): Promise<WorkspaceUser[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_master")
      .select(`
        id,
        full_name,
        email,
        profile_photo,
        last_login_at,
        is_active,
        departments!fk_user_master_department (name),
        designations!fk_user_master_designation (name),
        roles!fk_user_master_role (name)
      `)
      .eq("is_active", true)
      .neq("is_deleted", true)
      .order("full_name", { ascending: true });

    if (error) {
      console.error("fetchWorkspaceUsersForMessenger primary query error:", error);
      // Resilient fallback without foreign joins
      const { data: fbData, error: fbError } = await supabaseAdmin
        .from("user_master")
        .select("id, full_name, email, profile_photo, last_login_at, is_active")
        .eq("is_active", true)
        .neq("is_deleted", true)
        .order("full_name", { ascending: true });

      if (fbError || !fbData) {
        console.error("fetchWorkspaceUsersForMessenger fallback error:", fbError);
        return [];
      }

      return fbData.map((u: any) => ({
        id: u.id,
        full_name: u.full_name || "Unknown Colleague",
        email: u.email || "",
        profile_photo: u.profile_photo || null,
        last_login_at: u.last_login_at || null,
        is_active: u.is_active,
        department_name: null,
        designation_name: null,
        role_name: null,
      }));
    }

    return (data || []).map((u: any) => ({
      id: u.id,
      full_name: u.full_name || "Unknown Colleague",
      email: u.email || "",
      profile_photo: u.profile_photo || null,
      last_login_at: u.last_login_at || null,
      is_active: u.is_active,
      department_name: u.departments?.name || null,
      designation_name: u.designations?.name || null,
      role_name: u.roles?.name || null,
    }));
  } catch (err) {
    console.error("Error in fetchWorkspaceUsersForMessenger:", err);
    return [];
  }
}

/**
 * Fetch all conversations for current user, including participant info and unread counts.
 */
export async function fetchMessengerConversations(): Promise<MessengerConversation[]> {
  const currentUserId = await getAuthUser();

  try {
    // 1. Get all conversation IDs where current user is a participant
    const { data: myParticipations, error: partError } = await supabaseAdmin
      .from("messenger_participants")
      .select("conversation_id, last_read_at, is_pinned, is_muted")
      .eq("user_id", currentUserId);

    if (partError || !myParticipations || myParticipations.length === 0) {
      return [];
    }

    const conversationIds = myParticipations.map((p) => p.conversation_id);
    const myPartMap = new Map(myParticipations.map((p) => [p.conversation_id, p]));

    // 2. Fetch conversations
    const { data: convData, error: convError } = await supabaseAdmin
      .from("messenger_conversations")
      .select("*")
      .in("id", conversationIds)
      .eq("is_archived", false)
      .order("last_message_at", { ascending: false });

    if (convError || !convData) {
      console.error("fetchMessengerConversations error:", convError);
      return [];
    }

    // 3. Fetch all participants for these conversations
    const { data: allParticipants, error: allPartError } = await supabaseAdmin
      .from("messenger_participants")
      .select(`
        id,
        conversation_id,
        user_id,
        role,
        joined_at,
        last_read_at,
        is_pinned,
        is_muted,
        user_master (
          id,
          full_name,
          email,
          profile_photo,
          departments!fk_user_master_department (name),
          designations!fk_user_master_designation (name),
          roles!fk_user_master_role (name)
        )
      `)
      .in("conversation_id", conversationIds);

    if (allPartError) {
      console.error("Error fetching participants:", allPartError);
    }

    // Group participants by conversation_id
    const partsByConv = new Map<string, MessengerParticipant[]>();
    (allParticipants || []).forEach((p: any) => {
      const u = p.user_master;
      const formatted: MessengerParticipant = {
        id: p.id,
        conversation_id: p.conversation_id,
        user_id: p.user_id,
        role: p.role,
        joined_at: p.joined_at,
        last_read_at: p.last_read_at,
        is_pinned: p.is_pinned,
        is_muted: p.is_muted,
        user: u
          ? {
              id: u.id,
              full_name: u.full_name,
              email: u.email,
              profile_photo: u.profile_photo,
              department_name: u.departments?.name || null,
              designation_name: u.designations?.name || null,
              role_name: u.roles?.name || null,
              is_active: true,
            }
          : undefined,
      };
      const list = partsByConv.get(p.conversation_id) || [];
      list.push(formatted);
      partsByConv.set(p.conversation_id, list);
    });

    // 4. Calculate unread counts for each conversation
    // Query messages created after last_read_at
    const results: MessengerConversation[] = [];

    for (const conv of convData) {
      const myPart = myPartMap.get(conv.id);
      const lastReadAt = myPart?.last_read_at || conv.created_at;
      const isPinned = myPart?.is_pinned || false;

      // Count unread messages (not sent by self, not deleted, and after last_read_at)
      let unreadQuery = supabaseAdmin
        .from("messenger_messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .neq("sender_id", currentUserId)
        .eq("is_deleted", false);

      if (myPart?.last_read_at) {
        unreadQuery = unreadQuery.gt("created_at", myPart.last_read_at);
      }

      const { count } = await unreadQuery;

      const participants = partsByConv.get(conv.id) || [];
      let otherUser: WorkspaceUser | null = null;

      if (conv.type === "direct") {
        const otherPart = participants.find((p) => p.user_id !== currentUserId);
        otherUser = otherPart?.user || null;
      }

      results.push({
        id: conv.id,
        type: conv.type,
        title: conv.title,
        description: conv.description,
        avatar_url: conv.avatar_url,
        created_by: conv.created_by,
        last_message_at: conv.last_message_at,
        last_message_preview: conv.last_message_preview,
        last_message_sender_id: conv.last_message_sender_id,
        direct_user1_id: conv.direct_user1_id,
        direct_user2_id: conv.direct_user2_id,
        is_archived: conv.is_archived,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        participants,
        unread_count: count || 0,
        other_user: otherUser,
        is_pinned: isPinned,
      });
    }

    // Sort pinned conversations first, then by last_message_at DESC
    return results.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });
  } catch (err) {
    console.error("fetchMessengerConversations exception:", err);
    return [];
  }
}

/**
 * Get or create a direct 1-on-1 conversation with another Chandak Workspace user.
 */
export async function getOrCreateDirectConversation(targetUserId: string): Promise<{
  success: boolean;
  conversation?: MessengerConversation;
  error?: string;
}> {
  try {
    const currentUserId = await getAuthUser();

    if (currentUserId === targetUserId) {
      return { success: false, error: "Cannot create a direct conversation with yourself." };
    }

    // Canonical order for u1 and u2 to enforce single conversation pair
    const [u1, u2] = currentUserId < targetUserId ? [currentUserId, targetUserId] : [targetUserId, currentUserId];

    // Check if direct conversation already exists
    const { data: existing, error: findError } = await supabaseAdmin
      .from("messenger_conversations")
      .select("*")
      .eq("type", "direct")
      .eq("direct_user1_id", u1)
      .eq("direct_user2_id", u2)
      .maybeSingle();

    if (findError) {
      console.error("Error finding direct conversation:", findError);
      return { success: false, error: findError.message };
    }

    let conversationId = existing?.id;

    if (!conversationId) {
      // Create new direct conversation
      const { data: newConv, error: createError } = await supabaseAdmin
        .from("messenger_conversations")
        .insert({
          type: "direct",
          direct_user1_id: u1,
          direct_user2_id: u2,
          created_by: currentUserId,
          last_message_at: new Date().toISOString(),
          last_message_preview: "Direct conversation started",
        })
        .select()
        .single();

      if (createError || !newConv) {
        console.error("Error creating direct conversation:", createError);
        return { success: false, error: createError?.message || "Failed to create conversation" };
      }

      conversationId = newConv.id;

      // Add both participants
      await supabaseAdmin.from("messenger_participants").insert([
        {
          conversation_id: conversationId,
          user_id: currentUserId,
          role: "member",
          last_read_at: new Date().toISOString(),
        },
        {
          conversation_id: conversationId,
          user_id: targetUserId,
          role: "member",
          last_read_at: new Date().toISOString(),
        },
      ]);
    } else {
      // Ensure participants exist in case of previous partial state
      await supabaseAdmin
        .from("messenger_participants")
        .upsert(
          [
            { conversation_id: conversationId, user_id: currentUserId, role: "member" },
            { conversation_id: conversationId, user_id: targetUserId, role: "member" },
          ],
          { onConflict: "conversation_id,user_id" }
        );
    }

    // Fetch refreshed conversation list and find this conversation
    const all = await fetchMessengerConversations();
    const conv = all.find((c) => c.id === conversationId);

    return { success: true, conversation: conv };
  } catch (err: any) {
    console.error("getOrCreateDirectConversation error:", err);
    return { success: false, error: err.message || "Failed to start direct conversation." };
  }
}

/**
 * Create a new group conversation with title, description, and selected participants.
 */
export async function createGroupConversation(
  title: string,
  participantUserIds: string[],
  description?: string,
  avatarUrl?: string
): Promise<{ success: boolean; conversation?: MessengerConversation; error?: string }> {
  try {
    const currentUserId = await getAuthUser();

    if (!title.trim()) {
      return { success: false, error: "Group name is required." };
    }

    // Ensure current user is in participants
    const uniqueUserIds = Array.from(new Set([currentUserId, ...participantUserIds]));

    if (uniqueUserIds.length < 2) {
      return { success: false, error: "Please select at least one colleague to create a group." };
    }

    // Insert group conversation
    const { data: newConv, error: createError } = await supabaseAdmin
      .from("messenger_conversations")
      .insert({
        type: "group",
        title: title.trim(),
        description: description?.trim() || null,
        avatar_url: avatarUrl || null,
        created_by: currentUserId,
        last_message_at: new Date().toISOString(),
        last_message_preview: `Group created with ${uniqueUserIds.length} members`,
      })
      .select()
      .single();

    if (createError || !newConv) {
      console.error("createGroupConversation error:", createError);
      return { success: false, error: createError?.message || "Failed to create group" };
    }

    // Insert participants (creator as admin, others as members)
    const participantsToInsert = uniqueUserIds.map((uid) => ({
      conversation_id: newConv.id,
      user_id: uid,
      role: uid === currentUserId ? "admin" : "member",
      last_read_at: new Date().toISOString(),
    }));

    await supabaseAdmin.from("messenger_participants").insert(participantsToInsert);

    // Insert initial system message
    const { data: creatorUser } = await supabaseAdmin
      .from("user_master")
      .select("full_name")
      .eq("id", currentUserId)
      .single();

    const creatorName = creatorUser?.full_name || "A member";
    await supabaseAdmin.from("messenger_messages").insert({
      conversation_id: newConv.id,
      sender_id: currentUserId,
      content: `${creatorName} created the group "${title.trim()}"`,
      message_type: "system",
    });

    const all = await fetchMessengerConversations();
    const conv = all.find((c) => c.id === newConv.id);

    return { success: true, conversation: conv };
  } catch (err: any) {
    console.error("createGroupConversation error:", err);
    return { success: false, error: err.message || "Failed to create group." };
  }
}

/**
 * Fetch messages for a conversation with sender profile, reply context, and reactions.
 */
export async function fetchMessengerMessages(
  conversationId: string,
  limit: number = 60,
  beforeTimestamp?: string
): Promise<MessengerMessage[]> {
  const currentUserId = await getAuthUser();

  try {
    // Verify participation
    const { data: isParticipant } = await supabaseAdmin
      .from("messenger_participants")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (!isParticipant) {
      throw new Error("You are not a participant of this conversation.");
    }

    let query = supabaseAdmin
      .from("messenger_messages")
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        message_type,
        reply_to_id,
        attachments,
        mentions,
        is_edited,
        is_deleted,
        created_at,
        updated_at,
        user_master (
          id,
          full_name,
          email,
          profile_photo,
          departments!fk_user_master_department (name),
          designations!fk_user_master_designation (name),
          roles!fk_user_master_role (name)
        )
      `)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (beforeTimestamp) {
      query = query.lt("created_at", beforeTimestamp);
    }

    const { data: messages, error } = await query;

    if (error || !messages) {
      console.error("fetchMessengerMessages error:", error);
      return [];
    }

    // Collect reply_to IDs to fetch snippets
    const replyIds = messages.map((m: any) => m.reply_to_id).filter(Boolean);
    const replySnippetMap = new Map<string, { id: string; content: string; sender_name: string; message_type: string }>();

    if (replyIds.length > 0) {
      const { data: replies } = await supabaseAdmin
        .from("messenger_messages")
        .select(`
          id,
          content,
          message_type,
          user_master (full_name)
        `)
        .in("id", replyIds);

      (replies || []).forEach((r: any) => {
        replySnippetMap.set(r.id, {
          id: r.id,
          content: r.content,
          message_type: r.message_type,
          sender_name: (r.user_master as any)?.full_name || "Colleague",
        });
      });
    }

    // Fetch reactions for messages
    const messageIds = messages.map((m: any) => m.id);
    const reactionsMap = new Map<string, MessengerReaction[]>();

    if (messageIds.length > 0) {
      const { data: reactionsData } = await supabaseAdmin
        .from("messenger_reactions")
        .select(`
          id,
          message_id,
          user_id,
          reaction,
          created_at,
          user_master (full_name)
        `)
        .in("message_id", messageIds);

      (reactionsData || []).forEach((r: any) => {
        const list = reactionsMap.get(r.message_id) || [];
        list.push({
          id: r.id,
          message_id: r.message_id,
          user_id: r.user_id,
          reaction: r.reaction,
          created_at: r.created_at,
          user_name: (r.user_master as any)?.full_name || "Colleague",
        });
        reactionsMap.set(r.message_id, list);
      });
    }

    // Format in chronological order (oldest to newest)
    const formatted: MessengerMessage[] = messages
      .map((m: any) => {
        const u = m.user_master;
        return {
          id: m.id,
          conversation_id: m.conversation_id,
          sender_id: m.sender_id,
          content: m.content,
          message_type: m.message_type,
          reply_to_id: m.reply_to_id,
          reply_to: m.reply_to_id ? replySnippetMap.get(m.reply_to_id) || null : null,
          attachments: (m.attachments as MessengerAttachment[]) || [],
          mentions: (m.mentions as string[]) || [],
          is_edited: m.is_edited,
          is_deleted: m.is_deleted,
          created_at: m.created_at,
          updated_at: m.updated_at,
          sender: u
            ? {
                id: u.id,
                full_name: u.full_name,
                email: u.email,
                profile_photo: u.profile_photo,
                department_name: u.departments?.name || null,
                designation_name: u.designations?.name || null,
                role_name: u.roles?.name || null,
                is_active: true,
              }
            : undefined,
          reactions: reactionsMap.get(m.id) || [],
        };
      })
      .reverse();

    return formatted;
  } catch (err) {
    console.error("Error in fetchMessengerMessages:", err);
    return [];
  }
}

export interface SendMessagePayload {
  conversationId: string;
  content: string;
  messageType?: "text" | "image" | "file" | "voice" | "system" | "task_card" | "meeting_invite";
  replyToId?: string | null;
  attachments?: MessengerAttachment[];
  mentions?: string[];
}

/**
 * Send a message into a conversation.
 */
export async function sendMessengerMessage(payload: SendMessagePayload): Promise<{
  success: boolean;
  message?: MessengerMessage;
  error?: string;
}> {
  try {
    const currentUserId = await getAuthUser();
    const { conversationId, content, messageType = "text", replyToId = null, attachments = [], mentions = [] } = payload;

    if (!content.trim() && attachments.length === 0) {
      return { success: false, error: "Cannot send an empty message." };
    }

    // Verify participation
    const { data: part } = await supabaseAdmin
      .from("messenger_participants")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (!part) {
      return { success: false, error: "You are not a member of this conversation." };
    }

    // Insert message
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("messenger_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: content.trim(),
        message_type: messageType,
        reply_to_id: replyToId,
        attachments: attachments,
        mentions: mentions,
      })
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        message_type,
        reply_to_id,
        attachments,
        mentions,
        is_edited,
        is_deleted,
        created_at,
        updated_at,
        user_master (
          id,
          full_name,
          email,
          profile_photo,
          departments!fk_user_master_department (name),
          designations!fk_user_master_designation (name),
          roles!fk_user_master_role (name)
        )
      `)
      .single();

    if (insertError || !inserted) {
      console.error("sendMessengerMessage error:", insertError);
      return { success: false, error: insertError?.message || "Failed to send message." };
    }

    // Update sender's last_read_at
    await supabaseAdmin
      .from("messenger_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId);

    // Notify other participants or mentioned users
    try {
      const { data: otherParticipants } = await supabaseAdmin
        .from("messenger_participants")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", currentUserId);

      const senderName = (inserted.user_master as any)?.full_name || "A colleague";
      const previewText = content.trim() || (attachments.length ? `Sent ${attachments.length} attachment(s)` : "New message");

      // Dispatch in-app and offline device notifications
      for (const p of otherParticipants || []) {
        const isMentioned = mentions.includes(p.user_id) || mentions.includes("all");
        const notifTitle = isMentioned ? `${senderName} mentioned you in Chandak Messenger` : `Message from ${senderName}`;

        // Dispatch in-app and native OS desktop push (Strictly NO email notifications for messenger)
        dispatchNotification(
          p.user_id,
          notifTitle,
          previewText.slice(0, 180),
          `#messenger:${conversationId}`,
          "CHANDAK_MESSENGER",
          isMentioned ? "MESSENGER_MENTION" : "MESSENGER_NEW_MESSAGE",
          { _disableEmail: true }
        ).catch((err) => console.warn("Failed to dispatch messenger notification:", err));
      }
    } catch (notifErr) {
      console.warn("Non-blocking notification dispatch error:", notifErr);
    }

    const u = inserted.user_master as any;
    const formatted: MessengerMessage = {
      id: inserted.id,
      conversation_id: inserted.conversation_id,
      sender_id: inserted.sender_id,
      content: inserted.content,
      message_type: inserted.message_type as any,
      reply_to_id: inserted.reply_to_id,
      attachments: (inserted.attachments as MessengerAttachment[]) || [],
      mentions: (inserted.mentions as string[]) || [],
      is_edited: inserted.is_edited,
      is_deleted: inserted.is_deleted,
      created_at: inserted.created_at,
      updated_at: inserted.updated_at,
      sender: u
        ? {
            id: u.id,
            full_name: u.full_name,
            email: u.email,
            profile_photo: u.profile_photo,
            department_name: u.departments?.name || null,
            designation_name: u.designations?.name || null,
            role_name: u.roles?.name || null,
            is_active: true,
          }
        : undefined,
      reactions: [],
    };

    return { success: true, message: formatted };
  } catch (err: any) {
    console.error("sendMessengerMessage exception:", err);
    return { success: false, error: err.message || "Failed to send message." };
  }
}

/**
 * Mark a conversation as read for the current user.
 */
export async function markConversationAsRead(conversationId: string): Promise<boolean> {
  try {
    const currentUserId = await getAuthUser();
    await supabaseAdmin
      .from("messenger_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId);
    return true;
  } catch (err) {
    console.error("markConversationAsRead error:", err);
    return false;
  }
}

/**
 * Toggle pin status for a conversation.
 */
export async function togglePinConversation(conversationId: string, isPinned: boolean): Promise<boolean> {
  try {
    const currentUserId = await getAuthUser();
    await supabaseAdmin
      .from("messenger_participants")
      .update({ is_pinned: isPinned })
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId);
    return true;
  } catch (err) {
    console.error("togglePinConversation error:", err);
    return false;
  }
}

/**
 * Toggle emoji reaction on a message.
 */
export async function toggleMessageReaction(messageId: string, reaction: string): Promise<boolean> {
  try {
    const currentUserId = await getAuthUser();

    // Check if user already reacted with this reaction
    const { data: existing } = await supabaseAdmin
      .from("messenger_reactions")
      .select("id")
      .eq("message_id", messageId)
      .eq("user_id", currentUserId)
      .eq("reaction", reaction)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin.from("messenger_reactions").delete().eq("id", existing.id);
    } else {
      await supabaseAdmin.from("messenger_reactions").insert({
        message_id: messageId,
        user_id: currentUserId,
        reaction,
      });
    }
    return true;
  } catch (err) {
    console.error("toggleMessageReaction error:", err);
    return false;
  }
}

/**
 * Soft delete a message (only sender or super admin).
 * WhatsApp style: clears attachments, reactions, and marks message as deleted.
 */
export async function deleteMessengerMessage(messageId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUserId = await getAuthUser();

    const { data: msg } = await supabaseAdmin
      .from("messenger_messages")
      .select("sender_id, conversation_id")
      .eq("id", messageId)
      .single();

    if (!msg) return { success: false, error: "Message not found." };
    if (msg.sender_id !== currentUserId) {
      return { success: false, error: "You can only delete your own messages." };
    }

    await supabaseAdmin
      .from("messenger_messages")
      .update({
        is_deleted: true,
        content: "This message was deleted",
        attachments: [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    // Clean up reactions on deleted message
    await supabaseAdmin
      .from("messenger_reactions")
      .delete()
      .eq("message_id", messageId);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Edit a sent message within 4 hours of creation (WhatsApp style).
 * Can be edited immediately after sending, up to 4 hours.
 * Only the message sender can edit their own message.
 */
export async function editMessengerMessage(
  messageId: string,
  newContent: string
): Promise<{ success: boolean; message?: MessengerMessage; error?: string }> {
  try {
    const currentUserId = await getAuthUser();

    if (!newContent || !newContent.trim()) {
      return { success: false, error: "Message content cannot be empty." };
    }

    const { data: msg, error: fetchErr } = await supabaseAdmin
      .from("messenger_messages")
      .select("id, sender_id, conversation_id, is_deleted, created_at")
      .eq("id", messageId)
      .single();

    if (fetchErr || !msg) {
      return { success: false, error: "Message not found." };
    }

    if (msg.sender_id !== currentUserId) {
      return { success: false, error: "You can only edit your own messages." };
    }

    if (msg.is_deleted) {
      return { success: false, error: "Deleted messages cannot be edited." };
    }

    // Check 4-hour window: WhatsApp allows editing up to 4 hours
    const createdAtTime = new Date(msg.created_at).getTime();
    const nowTime = Date.now();
    const fourHoursMs = 4 * 60 * 60 * 1000;

    if (nowTime - createdAtTime > fourHoursMs) {
      return {
        success: false,
        error: "Messages can only be edited within 4 hours of sending.",
      };
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("messenger_messages")
      .update({
        content: newContent.trim(),
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        message_type,
        reply_to_id,
        attachments,
        mentions,
        is_edited,
        is_deleted,
        created_at,
        updated_at,
        user_master (
          id,
          full_name,
          email,
          profile_photo,
          departments!fk_user_master_department (name),
          designations!fk_user_master_designation (name),
          roles!fk_user_master_role (name)
        )
      `)
      .single();

    if (updateErr || !updated) {
      console.error("editMessengerMessage update error:", updateErr);
      return { success: false, error: updateErr?.message || "Failed to edit message." };
    }

    const u = updated.user_master as any;
    const formatted: MessengerMessage = {
      id: updated.id,
      conversation_id: updated.conversation_id,
      sender_id: updated.sender_id,
      content: updated.content,
      message_type: updated.message_type as any,
      reply_to_id: updated.reply_to_id,
      attachments: (updated.attachments as MessengerAttachment[]) || [],
      mentions: (updated.mentions as string[]) || [],
      is_edited: updated.is_edited,
      is_deleted: updated.is_deleted,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      sender: u
        ? {
            id: u.id,
            full_name: u.full_name,
            email: u.email,
            profile_photo: u.profile_photo,
            department_name: u.departments?.name || null,
            designation_name: u.designations?.name || null,
            role_name: u.roles?.name || null,
            is_active: true,
          }
        : undefined,
      reactions: [],
    };

    return { success: true, message: formatted };
  } catch (err: any) {
    console.error("editMessengerMessage exception:", err);
    return { success: false, error: err.message || "Failed to edit message." };
  }
}

/**
 * Get total unread messages count across all conversations for current user.
 */
export async function getMessengerTotalUnreadCount(targetUserId?: string): Promise<number> {
  try {
    const currentUserId = targetUserId || (await getAuthUser());

    const { data: participations } = await supabaseAdmin
      .from("messenger_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", currentUserId);

    if (!participations || participations.length === 0) return 0;

    let total = 0;
    for (const p of participations) {
      let query = supabaseAdmin
        .from("messenger_messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", p.conversation_id)
        .neq("sender_id", currentUserId)
        .eq("is_deleted", false);

      if (p.last_read_at) {
        query = query.gt("created_at", p.last_read_at);
      }

      const { count } = await query;
      total += count || 0;
    }
    return total;
  } catch (err) {
    console.error("getMessengerTotalUnreadCount error:", err);
    return 0;
  }
}

/**
 * Fetch sender preview info for real-time floating in-app notification.
 */
export async function fetchSenderInfoForNotification(
  senderId: string
): Promise<{ full_name: string; profile_photo: string | null }> {
  try {
    const { data } = await supabaseAdmin
      .from("user_master")
      .select("full_name, profile_photo")
      .eq("id", senderId)
      .maybeSingle();

    return {
      full_name: data?.full_name || "Colleague",
      profile_photo: data?.profile_photo || null,
    };
  } catch {
    return { full_name: "Colleague", profile_photo: null };
  }
}

/**
 * Add members to an existing group (group admin only).
 */
export async function addGroupMembers(
  conversationId: string,
  newUserIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUserId = await getAuthUser();

    // Check if current user is admin of group
    const { data: myPart } = await supabaseAdmin
      .from("messenger_participants")
      .select("role")
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (!myPart || myPart.role !== "admin") {
      return { success: false, error: "Only group administrators can add new members." };
    }

    const records = newUserIds.map((uid) => ({
      conversation_id: conversationId,
      user_id: uid,
      role: "member",
      last_read_at: new Date().toISOString(),
    }));

    await supabaseAdmin
      .from("messenger_participants")
      .upsert(records, { onConflict: "conversation_id,user_id" });

    // Insert system message
    const { data: adder } = await supabaseAdmin
      .from("user_master")
      .select("full_name")
      .eq("id", currentUserId)
      .single();

    await supabaseAdmin.from("messenger_messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: `${adder?.full_name || "Admin"} added ${newUserIds.length} new member(s) to the group.`,
      message_type: "system",
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Leave a group conversation.
 */
export async function leaveGroupConversation(conversationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUserId = await getAuthUser();

    const { data: user } = await supabaseAdmin
      .from("user_master")
      .select("full_name")
      .eq("id", currentUserId)
      .single();

    await supabaseAdmin
      .from("messenger_participants")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId);

    await supabaseAdmin.from("messenger_messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: `${user?.full_name || "A member"} left the group.`,
      message_type: "system",
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch task creation options (workspaces, priorities) for in-chat task creation modal.
 */
export async function fetchTaskOptionsForMessenger(): Promise<{
  workspaces: { id: string; name: string }[];
  priorities: { id: string; name: string; color?: string }[];
}> {
  try {
    await getAuthUser();
    const [wsRes, prioRes] = await Promise.all([
      supabaseAdmin
        .from("workspaces")
        .select("id, workspace_name")
        .eq("is_deleted", false)
        .order("workspace_name", { ascending: true })
        .limit(40),
      supabaseAdmin
        .from("priority_master")
        .select("id, priority_name, priority_color")
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("priority_order", { ascending: true }),
    ]);

    return {
      workspaces: (wsRes.data || []).map((w: any) => ({ id: w.id, name: w.workspace_name })),
      priorities: (prioRes.data || []).map((p: any) => ({
        id: p.id,
        name: p.priority_name,
        color: p.priority_color,
      })),
    };
  } catch (err) {
    console.warn("fetchTaskOptionsForMessenger fallback:", err);
    return { workspaces: [], priorities: [] };
  }
}

/**
 * Convert a chat message into a formal workspace task.
 * Creates the task and posts a rich interactive task card into the conversation.
 */
export async function createTaskFromChatMessage(payload: {
  conversationId: string;
  messageId: string;
  title: string;
  description?: string;
  workspaceId: string;
  subWorkspaceId?: string;
  assigneeId?: string;
  priorityId?: string;
  dueDate?: string;
}): Promise<{ success: boolean; task?: any; error?: string }> {
  try {
    const currentUserId = await getAuthUser();

    // 1. Resolve default priority if not supplied
    let priorityId = payload.priorityId?.trim();
    if (!priorityId) {
      const { data: prio } = await supabaseAdmin
        .from("priority_master")
        .select("id")
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("priority_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      priorityId = prio?.id;
    }

    if (!priorityId) {
      return { success: false, error: "No active priority found in system." };
    }

    // 2. Import createTask and execute
    const { createTask } = await import("@/lib/actions/tasks");
    const taskResult = await createTask({
      workspace_id: payload.workspaceId,
      sub_workspace_id: payload.subWorkspaceId,
      title: payload.title,
      subject: payload.title,
      description:
        payload.description ||
        `Created from Chandak Messenger message #${payload.messageId.slice(0, 8)}`,
      priority_id: priorityId,
      assigned_to: payload.assigneeId,
      end_date: payload.dueDate,
      created_by: currentUserId,
    });

    if (taskResult?.error || !taskResult?.data) {
      return { success: false, error: taskResult?.error || "Failed to create task" };
    }

    const createdTask = taskResult.data;

    // 3. Fetch assignee and workspace names for rich presentation card
    let assigneeName = "Unassigned";
    if (payload.assigneeId) {
      const { data: u } = await supabaseAdmin
        .from("user_master")
        .select("full_name")
        .eq("id", payload.assigneeId)
        .maybeSingle();
      if (u?.full_name) assigneeName = u.full_name;
    }

    let workspaceName = "Workspace";
    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("workspace_name")
      .eq("id", payload.workspaceId)
      .maybeSingle();
    if (ws?.workspace_name) workspaceName = ws.workspace_name;

    // 4. Post interactive Task Card into conversation
    const cardContent = JSON.stringify({
      taskId: createdTask.id,
      taskCode: createdTask.code || `TSK-${createdTask.id.slice(0, 4).toUpperCase()}`,
      title: payload.title,
      workspaceName,
      assigneeName,
      dueDate: payload.dueDate || null,
      sourceMessageId: payload.messageId,
    });

    await sendMessengerMessage({
      conversationId: payload.conversationId,
      content: cardContent,
      messageType: "task_card",
    });

    return { success: true, task: createdTask };
  } catch (err: any) {
    console.error("[createTaskFromChatMessage] Error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Start an instant video call from a conversation.
 * Posts an interactive meeting invitation card into the conversation.
 */
export async function startInstantCallFromChat(
  conversationId: string
): Promise<{ success: boolean; meetUrl?: string; error?: string }> {
  try {
    const currentUserId = await getAuthUser();
    const { data: user } = await supabaseAdmin
      .from("user_master")
      .select("full_name, email")
      .eq("id", currentUserId)
      .maybeSingle();

    const senderName = user?.full_name || "Colleague";
    const callRoomId = `call-${conversationId.slice(0, 8)}-${Date.now()}`;
    const meetUrl = `/meet/live?room=${callRoomId}`;

    // Collect all participant emails in this conversation
    const { data: participants } = await supabaseAdmin
      .from("messenger_participants")
      .select("user_id, user_master(id, email, full_name)")
      .eq("conversation_id", conversationId);

    const attendeeEmails: string[] = [];
    if (user?.email) attendeeEmails.push(user.email);
    for (const p of participants || []) {
      const email = (p as any)?.user_master?.email;
      if (email && !attendeeEmails.includes(email)) {
        attendeeEmails.push(email);
      }
    }

    const { generateTeamsMeetingLink } = await import("@/lib/integrations/microsoft-teams");
    const teamsUrl = await generateTeamsMeetingLink({
      title: `Instant Call with ${senderName}`,
      meetingCode: `CHAT-${conversationId.slice(0, 6)}`,
      organizerId: currentUserId,
      organizerEmail: user?.email,
      attendeeEmails,
      callType: "call",
    });

    const cardContent = JSON.stringify({
      callRoomId,
      meetUrl,
      teamsUrl,
      startedByName: senderName,
      startedAt: new Date().toISOString(),
    });

    await sendMessengerMessage({
      conversationId,
      content: cardContent,
      messageType: "meeting_invite",
    });

    return { success: true, meetUrl };
  } catch (err: any) {
    console.error("[startInstantCallFromChat] Error:", err);
    return { success: false, error: err.message };
  }
}
