import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies, headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/service_role";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const sessionToken = body.sessionToken;
    const clientUserAgent = body.userAgent || "Unknown Browser";

    if (!sessionToken) {
      return NextResponse.json({ success: false, error: "Missing session token" }, { status: 400 });
    }

    const reqHeaders = await headers();
    const forwardedFor = reqHeaders.get("x-forwarded-for");
    const realIp = reqHeaders.get("x-real-ip");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : (realIp || "Unknown IP");

    const now = new Date().toISOString();

    // 1. Upsert active_sessions record (exact schema: user_id, session_token, last_active_at)
    const { error: activeErr } = await supabaseAdmin
      .from("active_sessions")
      .upsert({
        user_id: user.id,
        session_token: sessionToken,
        last_active_at: now
      }, { onConflict: "user_id" });

    if (activeErr) {
      console.error("[Session Register API] active_sessions upsert error:", activeErr);
    }

    // 2. Mark any other session tokens for this user as inactive in auth_session_logs
    await supabaseAdmin
      .from("auth_session_logs")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .neq("session_token", sessionToken);

    // 3. Upsert session log
    const { data: existingLog } = await supabaseAdmin
      .from("auth_session_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("session_token", sessionToken)
      .maybeSingle();

    if (existingLog) {
      await supabaseAdmin
        .from("auth_session_logs")
        .update({
          ip_address: ipAddress,
          user_agent: clientUserAgent,
          last_activity: now,
          is_active: true
        })
        .eq("id", existingLog.id);
    } else {
      await supabaseAdmin
        .from("auth_session_logs")
        .insert([{
          user_id: user.id,
          session_token: sessionToken,
          ip_address: ipAddress,
          user_agent: clientUserAgent,
          login_time: now,
          last_activity: now,
          is_active: true
        }]);
    }

    // 4. Update user_master
    await supabaseAdmin
      .from("user_master")
      .update({
        last_login_at: now,
        last_active_at: now
      })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Session Register API Error]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
