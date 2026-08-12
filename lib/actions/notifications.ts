"use server";

import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { cookies } from "next/headers";

/**
 * Enterprise Notification & Webhook Engine
 */

export async function fetchUnreadNotifications() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("task_notifications")
    .select("*")
    .eq("user_id", userData.user.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
  return data || [];
}

export async function markNotificationAsRead(notificationId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { error } = await supabase
    .from("task_notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) throw new Error("Failed to mark notification as read");
}

export async function deleteNotification(notificationId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Use admin client to bypass RLS, but enforce user_id match for security
  const { error } = await supabaseAdmin
    .from("task_notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to delete notification:", error);
    throw new Error("Failed to delete notification");
  }
}

export async function deleteQueueNotification(notificationId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: notif } = await supabaseAdmin.from("notification_queue").select("target_user_id").eq("id", notificationId).single();
  if (!notif) return;

  if (notif.target_user_id !== user.id && notif.target_user_id !== 'GLOBAL_OPS') {
    throw new Error("Unauthorized");
  }

  await supabaseAdmin.from("notification_queue").delete().eq("id", notificationId);
}

export async function clearAllQueueNotifications() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabaseAdmin.from("notification_queue").delete().or(`target_user_id.eq.${user.id},recipient_id.eq.${user.id}`);
  
  // Try to clear GLOBAL_OPS if they are admin, fail silently if not
  try {
     const { data: roleData } = await supabaseAdmin.from("user_master").select("role_master(role_code)").eq("id", user.id).single();
     if ((roleData as any)?.role_master?.role_code === 'SUPER_ADMIN') {
        await supabaseAdmin.from("notification_queue").delete().eq("target_user_id", 'GLOBAL_OPS');
     }
  } catch (e) {}
}

// Nodemailer will be dynamically imported in dispatchNotification

import { fetchSpecificEventConfig, fetchSystemEmailConfig } from "./email-config";

export async function dispatchNotification(
  userId: string, 
  title: string, 
  message: string, 
  link?: string,
  moduleCode?: string,
  eventCode?: string
) {
  
  // 0. Fail-Fast Trigger Interceptor
  let isEmailEnabled = true;
  let isInAppEnabled = true;
  
  if (moduleCode && eventCode) {
    const config = await fetchSpecificEventConfig(moduleCode, eventCode);
    if (config) {
      isEmailEnabled = config.is_email_enabled !== false;
      isInAppEnabled = config.is_inapp_enabled !== false;
    }
    
    // If both are disabled, abort immediately to save resources
    if (!isEmailEnabled && !isInAppEnabled) {
      console.log(`[Notification Engine] Trigger aborted for ${moduleCode}:${eventCode} - both channels disabled.`);
      return;
    }
  }

  // 1. Insert into DB (In-App Queue)
  let notif: any = null;
  if (isInAppEnabled) {
    const { data: insertedNotif, error: notifError } = await supabaseAdmin.from("task_notifications").insert([{
      user_id: userId,
      title,
      message,
      link,
      is_read: false
    }]).select().single();
    if (notifError) console.error("Error inserting task_notification:", notifError);
    notif = insertedNotif;

    // Also insert into global notification queue for realtime stream consumers
    try {
      const isWorkspace = link?.includes('workspaces') && !link?.includes('task=');
      const isTicket = link?.includes('tickets');
      const entityType = isWorkspace ? 'workspace' : (isTicket ? 'ticket' : 'task');
      const moduleType = isWorkspace ? 'workspaces' : (isTicket ? 'tickets' : 'tasks');
      const extractedEntityId = link ? (link.includes('task=') ? link.split('task=')[1] : (link.includes('id=') ? link.split('id=')[1] : link.split('/').pop())) || 'SYS' : 'SYS';

      await supabaseAdmin.from('notification_queue').insert([{
        target_user_id: userId,
        recipient_id: userId,
        entity_type: entityType,
        entity_id: extractedEntityId,
        module: moduleType,
        action_type: eventCode?.toLowerCase() || 'notification',
        actor: 'System',
        redirect_url: link || null,
        priority_level: eventCode === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM',
        is_read: false,
        payload: { 
          id: notif?.id || null,
          title,
          message 
        }
      }]);
    } catch (e) {
      console.error('Failed to insert into notification_queue', e);
    }
  }

  // 2. Email Delivery Phase
  if (isEmailEnabled) {
    // Fetch User Email
    const { data: user } = await supabaseAdmin.from("user_master").select("email, full_name").eq("id", userId).single();
    if (!user?.email) return;

    // Build absolute URL for emails
    let baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!baseUrl) {
      try {
        const { headers } = await import('next/headers');
        const headersList = await headers();
        const host = headersList.get('host');
        const protocol = headersList.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
        if (host) baseUrl = `${protocol}://${host}`;
      } catch (e) {
        // Fallback for background contexts
      }
    }
    baseUrl = baseUrl || "https://chandakgroup.tech";
    
    const absoluteLink = link ? (link.startsWith('http') ? link : `${baseUrl}${link}`) : '';

    // Insert into corporate email_queue table
    try {
      let finalSubject = title;
      let finalBody = `${message}\n\nLink: ${absoluteLink || 'N/A'}`;

      if (moduleCode && eventCode) {
        const { data: template } = await supabaseAdmin
          .from("email_templates")
          .select("subject, html_body")
          .ilike("module", moduleCode)
          .ilike("event", eventCode)
          .eq("is_active", true)
          .single();

        if (template) {
          const payload = { title, message, link: absoluteLink, recipient_name: user.full_name || user.email };
          const hydrate = (text: string) => {
            if (!text) return text;
            let hydrated = text;
            const matches = hydrated.match(/{{(.*?)}}/g);
            if (matches) {
              matches.forEach(match => {
                const key = match.replace(/[{}]/g, "").trim();
                hydrated = hydrated.replace(match, String(payload[key as keyof typeof payload] || ""));
              });
            }
            return hydrated;
          };

          if (template.subject) finalSubject = hydrate(template.subject);
          if (template.html_body) finalBody = hydrate(template.html_body);
        }
      }

      await supabaseAdmin.from('email_queue').insert([{
        recipient_email: user.email,
        subject: finalSubject,
        body_template: finalBody,
        is_sent: false
      }]);
      
      // Async trigger the cron job so the email sends immediately via configured providers
      const triggerUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chandakgroup.tech";
      fetch(`${triggerUrl}/api/cron/process-email-queue`, { method: 'POST' }).catch(() => {});
      
    } catch (e) {
      console.error('Failed to insert into email_queue', e);
    }
  }
}

export async function handleMentions(
  entityId: string, 
  messageId: string, 
  mentionedUserIds: string[] = [], 
  isAll: boolean = false, 
  senderId: string,
  entityType: 'task' | 'ticket' = 'task'
) {
  let targetUserIds = new Set<string>(mentionedUserIds);
  let workspaceId: string | null = null;
  let entityLabel = entityType === 'ticket' ? 'Ticket' : 'Task';

  if (entityType === 'ticket') {
    const { data: ticket } = await supabaseAdmin.from("tickets").select("workspace_id, title, ticket_number").eq("id", entityId).single();
    if (ticket) {
      workspaceId = ticket.workspace_id;
      entityLabel = ticket.ticket_number ? `Ticket #${ticket.ticket_number}` : (ticket.title || 'Ticket');
    }
  } else {
    const { data: task } = await supabaseAdmin.from("tasks").select("workspace_id, subject, title").eq("id", entityId).single();
    if (task) {
      workspaceId = task.workspace_id;
      entityLabel = task.subject || task.title || 'Task';
    }
  }

  if (isAll && workspaceId) {
    const { data: members } = await supabaseAdmin.from("workspace_members").select("user_id").eq("workspace_id", workspaceId);
    if (members) {
      members.forEach(m => targetUserIds.add(m.user_id));
    }
  }

  // Remove the sender from the notification list so they don't notify themselves
  if (senderId) {
    targetUserIds.delete(senderId);
  }

  const matchedUserIds = Array.from(targetUserIds);
  if (matchedUserIds.length === 0) return;

  // Insert mentions into DB for tracking
  if (entityType === 'task') {
    const mentionsToInsert = matchedUserIds.map(uid => ({
      message_id: messageId,
      mentioned_user_id: uid
    }));
    try {
      await supabaseAdmin.from("task_mentions").insert(mentionsToInsert);
    } catch (e) {
      console.warn("task_mentions insert notice:", e);
    }
  }

  // Fetch sender name for better notification
  const { data: sender } = await supabaseAdmin.from("user_master").select("full_name").eq("id", senderId).single();
  const senderName = sender?.full_name || "A team member";

  const notifTitle = isAll 
    ? `Announcement in ${entityLabel} from ${senderName}` 
    : `Mentioned in ${entityLabel} by ${senderName}`;
  const notifMessage = isAll 
    ? `${senderName} mentioned @All in ${entityLabel.toLowerCase()} chat.`
    : `${senderName} mentioned you in ${entityLabel.toLowerCase()} chat.`;

  const link = entityType === 'ticket' ? `/tickets?id=${entityId}` : `/tasks/${entityId}`;

  // Trigger Notifications for each mention
  for (const uid of matchedUserIds) {
    await dispatchNotification(
      uid,
      notifTitle,
      notifMessage,
      link,
      entityType === 'ticket' ? 'TICKETS' : 'TASKS',
      'MENTION'
    );
  }
}

export async function markMentionsReadForTask(taskId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;

  // Fetch message ids for the task
  const { data: msgs } = await supabase.from('task_chat_messages').select('id').eq('task_id', taskId);
  const msgIds = (msgs || []).map((m: any) => m.id);
  if (msgIds.length === 0) return;

  // Mark mentions for this user and those messages as read
  const { error } = await supabase.from('task_mentions').update({ is_read: true }).eq('mentioned_user_id', userId).in('message_id', msgIds);
  if (error) console.error('Failed to mark mentions read', error);
}
