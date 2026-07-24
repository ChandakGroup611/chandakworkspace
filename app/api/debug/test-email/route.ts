import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to_email = "test@example.com", subject = "Test Trigger", message = "This is a test notification." } = body;

    // Use Service Role to insert directly into email_queue and trigger process
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // We can directly insert into the email_queue bypassing the rules engine
    // to test if the queue processor and SMTP setup works.
    const { data: queueItem, error } = await supabaseAdmin.from("email_queue").insert([{
      module: "System",
      event: "Test",
      recipient_email: to_email,
      subject: subject,
      html_body: `<div style="padding:20px;"><h2>${subject}</h2><p>${message}</p></div>`,
      body_template: message,
      status: "PENDING"
    }]).select().single();

    if (error) {
      throw new Error(`Failed to insert into queue: ${error.message}`);
    }

    // Trigger the background processor
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    fetch(`${baseUrl}/api/cron/process-email-queue`, {
      method: 'POST',
      signal: AbortSignal.timeout(500)
    }).catch(() => {});

    return NextResponse.json({ 
      success: true, 
      message: "Test email queued and processor triggered.",
      queueItem
    });
  } catch (error: any) {
    console.error("[Test Email Endpoint Error]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
