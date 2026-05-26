"use server";

import { createClient } from "@/utils/supabase/server";
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

import { supabaseAdmin } from "@/lib/supabase/service_role";
import nodemailer from "nodemailer";

export async function dispatchNotification(userId: string, title: string, message: string, link?: string) {
  
  // 1. Insert into DB (In-App Queue)
  const { data: notif, error: notifError } = await supabaseAdmin.from("task_notifications").insert([{
    user_id: userId,
    title,
    message,
    link,
    is_read: false
  }]).select().single();
  if (notifError) console.error("Error inserting task_notification:", notifError);

  // Also insert into global notification queue for realtime stream consumers
  try {
    const isWorkspace = link?.includes('workspaces') && !link?.includes('task=');
    await supabaseAdmin.from('notification_queue').insert([{
      target_user_id: userId,
      entity_type: isWorkspace ? 'workspace' : 'task',
      entity_id: link ? (link.includes('task=') ? link.split('task=')[1] : link.split('/').pop()) || 'SYS' : 'SYS',
      module: isWorkspace ? 'workspaces' : 'tasks',
      action_type: 'assignment',
      actor: 'System',
      redirect_url: link || null,
      priority_level: 'LOW',
      is_read: false,
      payload: { 
        id: notif?.id || null,
        message 
      }
    }]);
  } catch (e) {
    console.error('Failed to insert into notification_queue', e);
  }

  // 2. Fetch User Email
  const { data: user } = await supabaseAdmin.from("user_master").select("email").eq("id", userId).single();
  if (!user?.email) return;

  // Insert into corporate email_queue table
  try {
    await supabaseAdmin.from('email_queue').insert([{
      recipient_email: user.email,
      subject: title,
      body_template: `${message}\n\nLink: ${link || 'N/A'}`,
      status: 'pending'
    }]);
  } catch (e) {
    console.error('Failed to insert into email_queue', e);
  }

  // 3. SMTP Trigger
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"Enterprise Platform" <${process.env.SMTP_FROM || 'no-reply@enterprise.com'}>`,
        to: user.email,
        subject: title,
        text: `${message}\n\nLink: ${link || 'N/A'}`
      });
      console.log(`[Email Dispatch Success] To: ${user.email}`);
    } catch (e) {
      console.error(`[Email Dispatch Failed]`, e);
    }
  } else {
    console.log(`[Email Mock Triggered - No SMTP Config] To User: ${userId} | Subject: ${title} | Body: ${message}`);
  }
}

export async function handleMentions(taskId: string, messageId: string, mentionedUserIds: string[] = [], isAll: boolean = false, senderId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  let targetUserIds = new Set<string>(mentionedUserIds);

  if (isAll) {
    // Fetch all workspace members for this task's workspace
    const { data: task } = await supabaseAdmin.from("tasks").select("workspace_id").eq("id", taskId).single();
    if (task?.workspace_id) {
      const { data: members } = await supabaseAdmin.from("workspace_members").select("user_id").eq("workspace_id", task.workspace_id);
      if (members) {
        members.forEach(m => targetUserIds.add(m.user_id));
      }
    }
  }

  // Remove the sender from the notification list so they don't notify themselves
  if (senderId) {
    targetUserIds.delete(senderId);
  }

  const matchedUserIds = Array.from(targetUserIds);
  if (matchedUserIds.length === 0) return;

  // Insert mentions into DB for tracking
  const mentionsToInsert = matchedUserIds.map(uid => ({
    message_id: messageId,
    mentioned_user_id: uid
  }));
  
  await supabaseAdmin.from("task_mentions").insert(mentionsToInsert);

  // Fetch sender name for better notification
  const { data: sender } = await supabaseAdmin.from("user_master").select("full_name").eq("id", senderId).single();
  const senderName = sender?.full_name || "Someone";

  const notifTitle = isAll ? `Workspace Announcement from ${senderName}` : `You were mentioned by ${senderName}`;
  const notifMessage = isAll 
    ? `${senderName} mentioned @All in the task chat.`
    : `${senderName} mentioned you in the task chat.`;

  // Trigger Notifications for each mention
  for (const uid of matchedUserIds) {
    await dispatchNotification(
      uid,
      notifTitle,
      notifMessage,
      `/workspaces?task=${taskId}`
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
