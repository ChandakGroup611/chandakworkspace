import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/service_role";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, currentSessionToken } = body || {};

    if (!userId) {
      return NextResponse.json({ hasConflict: false, error: "Missing userId" }, { status: 400 });
    }

    // 1. Query active_sessions table for this user
    const { data: activeSession, error: activeErr } = await supabaseAdmin
      .from("active_sessions")
      .select("session_token, last_active_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (activeErr) {
      console.error("[Session Conflict API] active_sessions query error:", activeErr);
      return NextResponse.json({ hasConflict: false });
    }

    if (!activeSession || !activeSession.session_token) {
      return NextResponse.json({ hasConflict: false });
    }

    // If client provided same session token, it's the same browser
    if (currentSessionToken && activeSession.session_token === currentSessionToken) {
      return NextResponse.json({ hasConflict: false });
    }

    // Check if the session is recent (within 24 hours)
    const lastActive = activeSession.last_active_at ? new Date(activeSession.last_active_at).getTime() : 0;
    const now = Date.now();
    const isRecent = (now - lastActive) < 24 * 60 * 60 * 1000;

    if (!isRecent) {
      return NextResponse.json({ hasConflict: false });
    }

    // 2. Fetch rich metadata about the existing active session
    const { data: sessionLog } = await supabaseAdmin
      .from("auth_session_logs")
      .select("ip_address, user_agent, login_time, last_activity")
      .eq("user_id", userId)
      .eq("session_token", activeSession.session_token)
      .maybeSingle();

    return NextResponse.json({
      hasConflict: true,
      existingSession: {
        userAgent: sessionLog?.user_agent || "Unknown Browser / Device",
        ipAddress: sessionLog?.ip_address || "Unknown IP",
        loginTime: sessionLog?.login_time || activeSession.last_active_at,
        lastActiveAt: sessionLog?.last_activity || activeSession.last_active_at
      }
    });
  } catch (err: any) {
    console.error("[Session Conflict API] Error:", err);
    return NextResponse.json({ hasConflict: false, error: err.message }, { status: 500 });
  }
}
