import { supabaseAdmin } from "@/lib/supabase/service_role";

// Progressive backoff intervals in milliseconds: 1 min, 5 min, 15 min, 60 min
const RETRY_BACKOFF_MS = [
  60 * 1000,        // Attempt 1 -> retry in 1 min
  5 * 60 * 1000,    // Attempt 2 -> retry in 5 min
  15 * 60 * 1000,   // Attempt 3 -> retry in 15 min
  60 * 60 * 1000    // Attempt 4 -> retry in 60 min
];

export async function processEmailQueueAsync() {
  try {
    if (!supabaseAdmin) {
      console.warn("Supabase Admin client not initialized. Cannot process emails.");
      return;
    }

    // 1. Claim pending queue items using SELECT ... FOR UPDATE SKIP LOCKED via RPC
    let queueItems: any[] = [];
    const { data: claimed, error: rpcErr } = await supabaseAdmin
      .rpc('claim_email_queue_batch', { p_batch_size: 10 });

    if (!rpcErr && claimed && claimed.length > 0) {
      queueItems = claimed;
    } else if (rpcErr) {
      console.warn("[Queue Processor] claim_email_queue_batch RPC failed, using fallback query:", rpcErr.message);
      // Fallback query if RPC encounters unexpected error
      const { data: fallbackItems, error: fetchErr } = await supabaseAdmin
        .from("email_queue")
        .select("*")
        .eq("is_sent", false)
        .in("status", ["PENDING", "RETRY", "FAILED"])
        .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
        .lt("attempts", 5)
        .order("created_at", { ascending: true })
        .limit(10);

      if (fetchErr) {
        console.error("[Queue Processor] Fetch Error:", fetchErr);
        return;
      }
      if (fallbackItems && fallbackItems.length > 0) {
        queueItems = fallbackItems;
        const queueIds = queueItems.map((q: any) => q.id);
        await supabaseAdmin
          .from("email_queue")
          .update({ status: "PROCESSING", processed_at: new Date().toISOString() })
          .in("id", queueIds);
      }
    }

    if (!queueItems || queueItems.length === 0) {
      return;
    }

    // 2. Fetch Active Providers mapped by Priority
    const { data: providers } = await supabaseAdmin
      .from("email_providers")
      .select("*")
      .eq("is_active", true)
      .order("priority_level", { ascending: true });

    if (!providers || providers.length === 0) {
      await markQueueFailedBatch(queueItems, null, "No active email providers configured.");
      return;
    }

    // 3. Process each claimed item
    for (const item of queueItems) {
      let delivered = false;
      let lastError = "";

      for (const provider of providers) {
        try {
          console.log(`[Queue Processor] Attempting to send ${item.id} via ${provider.provider_name}`);
          const success = await dispatchEmail(item, provider);
          
          if (success) {
            delivered = true;
            await supabaseAdmin.from("email_delivery_logs").insert({
              queue_id: item.id,
              recipient_email: item.recipient_email,
              status: "DELIVERED",
              provider_id: provider.id
            });

            await supabaseAdmin.from("email_queue").update({
              is_sent: true,
              status: "COMPLETED",
              sent_at: new Date().toISOString(),
              processed_at: new Date().toISOString(),
              provider_used: provider.id
            }).eq("id", item.id);
            break; 
          }
        } catch (err: any) {
          lastError = err.message;
          console.error(`[Queue Processor] Provider ${provider.provider_name} failed:`, err.message);
        }
      }

      if (!delivered) {
        await supabaseAdmin.from("email_delivery_logs").insert({
          queue_id: item.id,
          recipient_email: item.recipient_email,
          status: "FAILED"
        });

        const currentAttempts = (item.attempts || item.retry_count || 0) + 1;

        if (currentAttempts >= 5) {
          // Max attempts reached: mark as permanent poison failure and alert admin (Item 4.1)
          await supabaseAdmin.from("email_queue").update({
            is_sent: false,
            status: "FAILED",
            attempts: currentAttempts,
            retry_count: currentAttempts,
            error_message: lastError || "Permanent failure: all fallback providers failed after 5 attempts.",
            processed_at: new Date().toISOString(),
            next_retry_at: null
          }).eq("id", item.id);

          await alertAdminOnPoisonEmail(item, currentAttempts, lastError);
        } else {
          // Progressive backoff: 1m, 5m, 15m, 60m
          const backoffDelay = RETRY_BACKOFF_MS[currentAttempts - 1] || (60 * 60 * 1000);
          const nextRetryDate = new Date(Date.now() + backoffDelay).toISOString();

          await supabaseAdmin.from("email_queue").update({
            is_sent: false,
            status: "RETRY",
            attempts: currentAttempts,
            retry_count: currentAttempts,
            next_retry_at: nextRetryDate,
            error_message: lastError || "Provider delivery failed. Scheduled for progressive retry.",
            processed_at: new Date().toISOString()
          }).eq("id", item.id);
        }
      }
    }

    // R4: No self-rescheduling setTimeout loop. Process once per event; 
    // the 15-minute cron (/api/cron/process-email-queue) handles scheduled retries cleanly.
  } catch (error: any) {
    console.error("[Queue Processor] Fatal Error:", error);
  }
}

async function markQueueFailedBatch(items: any[], providerId: string | null, errorMsg: string) {
  for (const item of items) {
    const currentAttempts = (item.attempts || item.retry_count || 0) + 1;
    const updatePayload: Record<string, any> = {
      is_sent: false,
      attempts: currentAttempts,
      retry_count: currentAttempts,
      error_message: errorMsg,
      processed_at: new Date().toISOString()
    };

    if (currentAttempts >= 5) {
      updatePayload.status = "FAILED";
      updatePayload.next_retry_at = null;
      await alertAdminOnPoisonEmail(item, currentAttempts, errorMsg);
    } else {
      const backoffDelay = RETRY_BACKOFF_MS[currentAttempts - 1] || (60 * 60 * 1000);
      updatePayload.status = "RETRY";
      updatePayload.next_retry_at = new Date(Date.now() + backoffDelay).toISOString();
    }

    await supabaseAdmin.from("email_queue").update(updatePayload).eq("id", item.id);
    await supabaseAdmin.from("email_delivery_logs").insert({
      queue_id: item.id,
      recipient_email: item.recipient_email,
      status: "FAILED",
      provider_id: providerId
    });
  }
}

async function alertAdminOnPoisonEmail(item: any, attempts: number, errorMsg: string) {
  try {
    const alertTitle = `Email Delivery Poison Alert: ${item.recipient_email}`;
    const alertMessage = `Permanent failure delivering email to ${item.recipient_email} (Subject: "${item.subject || 'No Subject'}"). Failed after ${attempts} attempts. Error: ${errorMsg || 'Unknown error'}`;

    // Alert via notification_queue for Super Admins
    const { data: superAdmins } = await supabaseAdmin
      .from("user_master")
      .select("id")
      .eq("role_code", "SUPER_ADMIN")
      .eq("is_active", true)
      .eq("is_deleted", false);

    const adminIds = (superAdmins || []).map(a => a.id);
    if (adminIds.length > 0) {
      const notifications = adminIds.map(adminId => ({
        recipient_id: adminId,
        payload: {
          title: alertTitle,
          message: alertMessage,
          severity: "CRITICAL",
          type: "EMAIL_POISON_FAILURE",
          queue_id: item.id,
          recipient_email: item.recipient_email,
          subject: item.subject,
          attempts: attempts
        },
        is_read: false
      }));
      await supabaseAdmin.from("notification_queue").insert(notifications);
    }

    console.warn(`[alertAdminOnPoisonEmail] Poison email alert logged for queue item ${item.id} (${item.recipient_email})`);
  } catch (alertErr) {
    console.error("[alertAdminOnPoisonEmail] Failed to alert admin:", alertErr);
  }
}

async function dispatchEmail(item: any, provider: any) {
  if (!provider.config) throw new Error("Invalid provider configuration.");
  
  if (provider.provider_name === "SMTP" || provider.provider_name === "Microsoft 365" || provider.provider_name === "Resend" || provider.provider_name === "SendGrid") {
    // Note: the original codebase didn't support Resend via API, it just threw an error. 
    // We will assume "Resend" uses SMTP config here just like SMTP does, because the UI says "SMTP Host: smtp.resend.com"
    const nodemailerRaw = await import('nodemailer');
    const nodemailer = nodemailerRaw.default || nodemailerRaw;
    
    let transportConfig: any = {
      host: provider.config.host || provider.config.smtp_host,
      port: Number(provider.config.port || provider.config.smtp_port),
      secure: Number(provider.config.port || provider.config.smtp_port) === 465, 
    };

    if (provider.config.username || provider.config.smtp_username) {
      transportConfig.auth = {
        user: provider.config.username || provider.config.smtp_username,
        pass: provider.config.password || provider.config.smtp_password || provider.config.api_key,
      };
    } else {
      transportConfig.tls = { rejectUnauthorized: false };
    }

    const transporter = nodemailer.createTransport(transportConfig);
    const authUser = provider.config.username || provider.config.smtp_username;
    const configuredFrom = provider.config.from_email || provider.config.sender_email || "Noreply@chandakgroup.com";
    const senderName = provider.config.sender_name || provider.config.from_name || "Noreply";
    const replyToEmail = provider.config.reply_to || "Noreply@chandakgroup.com";
    
    // For Microsoft 365 / Exchange SMTP, Microsoft rejects if the envelope from does not match the authenticated user (554 5.2.252 SendAsDenied).
    // Use the authenticated user as the sender address while preserving the friendly display name and replyTo.
    const isM365 = provider.provider_name === "Microsoft 365" || 
      (provider.config.host || provider.config.smtp_host || '').toLowerCase().includes('office365');
    const effectiveFrom = (isM365 && authUser) ? authUser : configuredFrom;

    const hasHtml = item.html_body || (item.body_template && (item.body_template.includes('<p') || item.body_template.includes('<div') || item.body_template.includes('<html') || item.body_template.includes('<table') || item.body_template.includes('<body')));
    
    let htmlContent = item.html_body || (hasHtml ? item.body_template : undefined);

    // If no HTML is present (e.g. legacy plain text), automatically wrap it into the standard branded HTML card
    if (!htmlContent) {
      const { convertPlainTextToHtmlCard } = await import('@/lib/email/email-renderer');
      htmlContent = convertPlainTextToHtmlCard({
        title: item.subject || "System Notification",
        text: item.body_template || ""
      });
    }

    const textContent = item.body_template && !hasHtml 
      ? item.body_template 
      : (item.subject || "System Notification");

    try {
      await transporter.sendMail({
        from: `"${senderName}" <${effectiveFrom}>`,
        replyTo: replyToEmail,
        to: item.recipient_email,
        subject: item.subject || "System Notification",
        text: textContent,
        html: htmlContent
      });
      return true;
    } catch (sendErr: any) {
      // If any unexpected SendAsDenied (554 5.2.252) still occurs, fallback to authUser
      if (
        authUser && 
        effectiveFrom.toLowerCase() !== authUser.toLowerCase() && 
        (sendErr?.message?.includes('SendAsDenied') || sendErr?.message?.includes('554') || sendErr?.code === 'EENVELOPE')
      ) {
        console.warn(`[dispatchEmail] SendAsDenied for ${effectiveFrom}. Falling back to authenticated sender ${authUser} with "${senderName}" display name & replyTo.`);
        await transporter.sendMail({
          from: `"${senderName}" <${authUser}>`,
          replyTo: replyToEmail,
          to: item.recipient_email,
          subject: item.subject || "System Notification",
          text: textContent,
          html: htmlContent
        });
        return true;
      }
      throw sendErr;
    }
  } else {
    throw new Error(`Provider ${provider.provider_name} API integration is not yet implemented.`);
  }
}
