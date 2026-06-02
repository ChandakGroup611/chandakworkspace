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
    // Authenticate the user from cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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

    // Determine event type from body or query params
    let event = "heartbeat";
    try {
      // sendBeacon sends as text/plain or application/x-www-form-urlencoded
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = await request.json();
        event = body?.event || "heartbeat";
      }
    } catch {
      // No body (sendBeacon with no payload) — use query params
    }

    // Check query params as fallback (for sendBeacon URL params)
    if (event === "heartbeat") {
      const urlEvent = request.nextUrl.searchParams.get("event");
      if (urlEvent) event = urlEvent;
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

      if (error) {
        console.error("[Heartbeat] tab_close update error:", error.message);
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        );
      }
    } else {
      // Regular heartbeat — only update last_active_at
      const { error } = await supabaseAdmin
        .from("user_master")
        .update({ last_active_at: now })
        .eq("id", user.id);

      if (error) {
        console.error("[Heartbeat] update error:", error.message);
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true, serverTime: now });
  } catch (e: any) {
    console.error("[Heartbeat] Unhandled error:", e);
    return NextResponse.json(
      { ok: false, error: e.message || "unknown" },
      { status: 500 }
    );
  }
}
