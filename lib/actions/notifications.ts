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

import nodemailer from "nodemailer";

export async function dispatchNotification(userId: string, title: string, message: string, link?: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  // 1. Insert into DB (In-App Queue)
  const { data: notif } = await supabase.from("task_notifications").insert([{
    user_id: userId,
    title,
    message,
    link,
    is_read: false
  }]).select().single();

  // Also insert into global notification queue for realtime stream consumers
  try {
    await supabase.from('notification_queue').insert([{
      recipient_id: userId,
      status: 'pending',
      payload: {
        id: notif?.id || undefined,
        entity_type: 'task',
        entity_id: link ? link.split('task=')[1] || null : null,
        module: 'tasks',
        action_type: 'assignment',
        actor: null,
        message,
        redirect_url: link || null,
        priority_level: 'LOW',
        is_read: false
      }
    }]);
  } catch (e) {
    console.error('Failed to insert into notification_queue', e);
  }

  // 2. Fetch User Email
  const { data: user } = await supabase.from("user_master").select("email").eq("id", userId).single();
  if (!user?.email) return;

  // Insert into corporate email_queue table
  try {
    await supabase.from('email_queue').insert([{
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

export async function handleMentions(message: string, taskId: string, messageId: string) {
  // Regex to find @username
  const mentionRegex = /@(\w+)/g;
  const matches = message.match(mentionRegex);
  
  if (!matches || matches.length === 0) return;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  // Extract usernames without the @
  const usernames = matches.map(m => m.substring(1));
  
  // Find users by short code or full name (assuming short code for this example)
  const { data: users } = await supabase
    .from("user_master")
    .select("id, user_code")
    .in("user_code", usernames);
    
  if (!users || users.length === 0) return;

  const mentionsToInsert = users.map(u => ({
    message_id: messageId,
    mentioned_user_id: u.id
  }));

  await supabase.from("task_mentions").insert(mentionsToInsert);

  // Trigger Notifications for each mention
  for (const user of users) {
    await dispatchNotification(
      user.id,
      "You were mentioned in a task",
      `Someone mentioned you in task chat for Task ID: ${taskId}`,
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
