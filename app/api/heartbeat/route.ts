import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/service_role";

/**
 * POST /api/heartbeat
 * 
 * Lightweight heartbeat endpoint called by ClientSessionManager every 60 seconds.
 * Updates the user's `last_active_at` timestamp in user_master.
 * 
 * Body (optional JSON):
 *   - event: "tab_close" | "heartbeat" (default: "heartbeat")
 * 
 * Also supports navigator.sendBeacon (no JSON body, uses query params):
 *   - ?event=tab_close
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tkovzymkubxtpcgynkgd.supabase.co";
    const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrb3Z6eW1rdWJ4dHBjZ3lua2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODA2MjIsImV4cCI6MjA5NjU1NjYyMn0.CHw9iXsbW8Im7Ul4hnShVEOeZLWYHEJbvc3QG0VoK68");

    // Authenticate the user from cookies
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // We don't need to set cookies in this read-only endpoint
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    // Determine event type and sessionToken from body or query params
    let event = "heartbeat";
    let sessionToken: string | null = null;
    try {
      // sendBeacon sends as text/plain or application/x-www-form-urlencoded
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = await request.json();
        event = body?.event || "heartbeat";
        sessionToken = body?.sessionToken || null;
      }
    } catch {
      // No body (sendBeacon with no payload) — use query params
    }

    // Check query params as fallback (for sendBeacon URL params)
    if (event === "heartbeat") {
      const urlEvent = request.nextUrl.searchParams.get("event");
      if (urlEvent) event = urlEvent;
    }

    // Verify session token integrity to enforce single active session per user
    if (sessionToken && event !== "tab_close") {
      const { data: activeRec } = await supabaseAdmin
        .from("active_sessions")
        .select("session_token")
        .eq("user_id", user.id)
        .maybeSingle();

      if (activeRec && activeRec.session_token && activeRec.session_token !== sessionToken) {
        console.warn(`[Heartbeat] Concurrent login detected for user ${user.id}. Stale token: ${sessionToken}, Active: ${activeRec.session_token}`);
        return NextResponse.json(
          { ok: false, error: "concurrent_session" },
          { status: 401 }
        );
      }
    }

    const now = new Date().toISOString();

    if (event === "tab_close") {
      // User is closing their last tab — force offline immediately by backdating last_active_at
      const forcedOfflineTime = new Date(Date.now() - 120000 - 1000).toISOString();
      const { error } = await supabaseAdmin
        .from("user_master")
        .update({ 
          last_active_at: forcedOfflineTime, 
          last_logout_at: now 
        })
        .eq("id", user.id);

      // Also update active_sessions and auth_session_logs
      await supabaseAdmin
        .from("active_sessions")
        .update({ last_active_at: forcedOfflineTime })
        .eq("user_id", user.id);

      await supabaseAdmin
        .from("auth_session_logs")
        .update({ last_activity: now, is_active: false })
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) {
        console.error("[Heartbeat] tab_close update error:", error.message);
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        );
      }
    } else {
      // Regular heartbeat — update last_active_at in user_master, active_sessions, and auth_session_logs
      const { error } = await supabaseAdmin
        .from("user_master")
        .update({ last_active_at: now })
        .eq("id", user.id);

      await supabaseAdmin
        .from("active_sessions")
        .update({ last_active_at: now })
        .eq("user_id", user.id);

      await supabaseAdmin
        .from("auth_session_logs")
        .update({ last_activity: now, is_active: true })
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) {
        console.error("[Heartbeat] update error:", error.message);
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        );
      }
    }

    let buildId = 'build-latest';
    try {
      const fs = await import('fs');
      const path = await import('path');
      const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');
      if (fs.existsSync(buildIdPath)) {
        buildId = fs.readFileSync(buildIdPath, 'utf8').trim();
      }
    } catch (e) {}

    return NextResponse.json({ ok: true, serverTime: now, buildId });
  } catch (e: any) {
    console.error("[Heartbeat] Unhandled error:", e);
    return NextResponse.json(
      { ok: false, error: e.message || "unknown" },
      { status: 500 }
    );
  }
}
