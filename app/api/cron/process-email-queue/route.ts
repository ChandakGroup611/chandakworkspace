import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use Admin client to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function POST(request: Request) {
  try {
    // 1. Fetch pending queue items (Limit to 10 for batch processing)
    const { data: queueItems } = await supabaseAdmin
      .from("email_queue")
      .select("*")
      .eq("status", "PENDING")
      .order("created_at", { ascending: true })
      .limit(10);

    if (!queueItems || queueItems.length === 0) {
      return NextResponse.json({ message: "Queue is empty." });
    }

    // Mark as processing
    const queueIds = queueItems.map(q => q.id);
    await supabaseAdmin
      .from("email_queue")
      .update({ status: "PROCESSING" })
      .in("id", queueIds);

    // 2. Fetch Active Providers mapped by Priority
    const { data: providers } = await supabaseAdmin
      .from("email_providers")
      .select("*")
      .eq("is_active", true)
      .order("priority_level", { ascending: true });

    if (!providers || providers.length === 0) {
      await markQueueFailed(queueIds, null, "No active email providers configured.");
      return NextResponse.json({ error: "No providers" }, { status: 500 });
    }

    // 3. Process each item
    for (const item of queueItems) {
      let delivered = false;
      let lastError = "";

      for (const provider of providers) {
        try {
          // Attempt Delivery (Mocking actual provider execution for safety in this environment)
          console.log(`[Queue Processor] Attempting to send ${item.id} via ${provider.provider_name}`);
          
          const success = await simulateEmailDispatch(item, provider);
          
          if (success) {
            delivered = true;
            
            // Log Success
            await supabaseAdmin.from("email_delivery_logs").insert({
              queue_id: item.id,
              recipient_email: item.recipient_email,
              status: "DELIVERED",
              provider_id: provider.id
            });

            // Update Queue
            await supabaseAdmin.from("email_queue").update({
              status: "COMPLETED",
              processed_at: new Date().toISOString(),
              provider_used: provider.id
            }).eq("id", item.id);

            break; // Stop falling back since it succeeded
          }
        } catch (err: any) {
          lastError = err.message;
          console.error(`[Queue Processor] Provider ${provider.provider_name} failed:`, err.message);
          // Loop continues to next fallback provider automatically!
        }
      }

      if (!delivered) {
        // All fallbacks exhausted
        await supabaseAdmin.from("email_delivery_logs").insert({
          queue_id: item.id,
          recipient_email: item.recipient_email,
          status: "FAILED"
        });

        await supabaseAdmin.from("email_queue").update({
          status: "FAILED",
          error_message: lastError || "All configured fallback providers failed.",
          processed_at: new Date().toISOString()
        }).eq("id", item.id);
      }
    }

    // If there are more pending, trigger itself recursively
    const { count } = await supabaseAdmin
      .from("email_queue")
      .select("*", { count: 'exact', head: true })
      .eq("status", "PENDING");
      
    if (count && count > 0) {
      // Async trigger to continue processing
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      fetch(`${baseUrl}/api/cron/process-email-queue`, { method: 'POST', signal: AbortSignal.timeout(100) }).catch(() => {});
    }

    return NextResponse.json({ message: "Batch processed successfully.", processed: queueItems.length });
  } catch (error: any) {
    console.error("[Queue Processor] Fatal Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function markQueueFailed(ids: string[], providerId: string | null, errorMsg: string) {
  await supabaseAdmin
    .from("email_queue")
    .update({ status: "FAILED", error_message: errorMsg, processed_at: new Date().toISOString() })
    .in("id", ids);

  const logs = ids.map(id => ({
    queue_id: id,
    status: "FAILED",
    provider_id: providerId
  }));
  await supabaseAdmin.from("email_delivery_logs").insert(logs);
}

// In a real production system, this would import `nodemailer` or `@sendgrid/mail`. 
// For safety in this simulated enterprise branch, we mock the HTTP 200 OK.
async function simulateEmailDispatch(item: any, provider: any) {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 150));
  
  if (!provider.config) throw new Error("Invalid provider configuration.");
  
  // Random failure simulation to test the Fallback Router logic: 10% chance
  if (Math.random() < 0.1) {
    throw new Error(`Provider connection timeout on port ${provider.config.port || 'api'}`);
  }
  
  return true;
}
