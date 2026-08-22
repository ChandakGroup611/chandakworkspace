import { createClient } from "@supabase/supabase-js";

// Use Admin client to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null as any;

export async function processEmailQueueAsync() {
  try {
    if (!supabaseAdmin) {
      console.warn("Supabase Admin client not initialized. Cannot process emails.");
      return;
    }
    
    // 1. Fetch pending queue items (Limit to 10 for batch processing)
    // We try to exclude FAILED items. If 'status' column doesn't exist, we'll fall back to just is_sent = false
    let queueItems: any = null;
    let fetchErr: any = null;
    
    const { data: dataWithStatus, error: errWithStatus } = await supabaseAdmin
      .from("email_queue")
      .select("*")
      .eq("is_sent", false)
      .neq("status", "FAILED")
      .order("created_at", { ascending: true })
      .limit(10);

    if (errWithStatus && errWithStatus.code === '42703') { // undefined_column
       const { data: dataFallback, error: errFallback } = await supabaseAdmin
        .from("email_queue")
        .select("*")
        .eq("is_sent", false)
        .order("created_at", { ascending: true })
        .limit(10);
       queueItems = dataFallback;
       fetchErr = errFallback;
    } else {
       queueItems = dataWithStatus;
       fetchErr = errWithStatus;
    }

    if (fetchErr) {
       console.error("Fetch Error:", fetchErr);
       return;
    }

    if (!queueItems || queueItems.length === 0) {
      return;
    }

    // Mark as processing (Soft lock)
    const queueIds = queueItems.map((q: any) => q.id);
    const hasStatusColumn = 'status' in queueItems[0];
    
    if (hasStatusColumn) {
      await supabaseAdmin
        .from("email_queue")
        .update({ status: "PROCESSING" })
        .in("id", queueIds);
    }

    // 2. Fetch Active Providers mapped by Priority
    const { data: providers } = await supabaseAdmin
      .from("email_providers")
      .select("*")
      .eq("is_active", true)
      .order("priority_level", { ascending: true });

    if (!providers || providers.length === 0) {
      await markQueueFailed(queueIds, null, "No active email providers configured.");
      return;
    }

    // 3. Process each item
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

            const updatePayload: any = { is_sent: true, sent_at: new Date().toISOString() };
            if (hasStatusColumn) {
               updatePayload.status = "COMPLETED";
               updatePayload.processed_at = new Date().toISOString();
               updatePayload.provider_used = provider.id;
            }
            
            await supabaseAdmin.from("email_queue").update(updatePayload).eq("id", item.id);
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

        if (hasStatusColumn) {
           const failPayload: any = { 
             is_sent: false,
             status: "FAILED",
             error_message: lastError || "All configured fallback providers failed.",
             processed_at: new Date().toISOString()
           };
           await supabaseAdmin.from("email_queue").update(failPayload).eq("id", item.id);
        } else {
           // Legacy schema has no status column. Delete to prevent infinite poison loop.
           await supabaseAdmin.from("email_queue").delete().eq("id", item.id);
        }
      }
    }

    // If there are more pending, trigger itself recursively
    let pendingCount = 0;
    
    const { count: countWithStatus, error: countErrWithStatus } = await supabaseAdmin
      .from("email_queue")
      .select("*", { count: 'exact', head: true })
      .eq("is_sent", false)
      .neq("status", "FAILED");

    if (countErrWithStatus && countErrWithStatus.code === '42703') {
       const { count: fallbackCount } = await supabaseAdmin
         .from("email_queue")
         .select("*", { count: 'exact', head: true })
         .eq("is_sent", false);
       pendingCount = fallbackCount || 0;
    } else {
       pendingCount = countWithStatus || 0;
    }
      
    if (pendingCount > 0) {
      // Background recursive call
      setTimeout(() => {
        processEmailQueueAsync().catch(console.error);
      }, 2000);
    }
  } catch (error: any) {
    console.error("[Queue Processor] Fatal Error:", error);
  }
}

async function markQueueFailed(ids: string[], providerId: string | null, errorMsg: string) {
  await supabaseAdmin
    .from("email_queue")
    .update({ is_sent: false })
    .in("id", ids);

  const logs = ids.map(id => ({
    queue_id: id,
    status: "FAILED",
    provider_id: providerId
  }));
  await supabaseAdmin.from("email_delivery_logs").insert(logs);
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
    const senderEmail = provider.config.username || provider.config.smtp_username || "no-reply@chandakgroup.com";
    
    const hasHtml = item.html_body || (item.body_template && (item.body_template.includes('<p>') || item.body_template.includes('<div') || item.body_template.includes('<html')));
    const textContent = hasHtml && !item.html_body ? "Please view this email in an HTML-compatible client." : (item.body_template || "You have a new notification.");
    const htmlContent = item.html_body || (hasHtml ? item.body_template : undefined);

    await transporter.sendMail({
      from: `"Chandak Workspace" <${senderEmail}>`,
      to: item.recipient_email,
      subject: item.subject || "System Notification",
      text: textContent,
      html: htmlContent
    });
    
    return true;
  } else {
    throw new Error(`Provider ${provider.provider_name} API integration is not yet implemented.`);
  }
}
