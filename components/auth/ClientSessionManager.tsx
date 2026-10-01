"use client";
import { toast } from 'react-toastify';

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

// =========================================================================
// Production-Grade Session Manager
//
// Responsibilities:
// 1. Server-side heartbeat — POST /api/heartbeat every 60s while tab is visible & user active
// 2. Visibility-aware idle tracking — pauses heartbeat when hidden, resumes on visible
// 3. Tab close — navigator.sendBeacon for reliable close detection
// 4. Session resume — on tab reopen, checks JWT validity instead of fragile localStorage
// 5. Cross-tab coordination — BroadcastChannel so multiple tabs share one heartbeat
// 6. Multi-device / Concurrent login protection via Realtime active_sessions
// =========================================================================

const HEARTBEAT_INTERVAL_MS = 60_000; // 60 seconds
const SESSION_IDLE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes — matches Navbar timeout
const BROADCAST_CHANNEL_NAME = "adios_session_heartbeat";
const ACTIVITY_BROADCAST_THROTTLE_MS = 10_000; // 10s throttle to protect main thread

export default function ClientSessionManager() {
  const router = useRouter();
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const lastBroadcastRef = useRef<number>(0);
  const isLeaderRef = useRef<boolean>(true); // Whether this tab owns the heartbeat
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const isMountedRef = useRef(true);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Send a heartbeat to the server ──────────────────────────────
  const sendHeartbeat = useCallback(async (event: "heartbeat" | "tab_close" = "heartbeat") => {
    try {
      if (event === "tab_close") {
        // Use sendBeacon for tab close — it's fire-and-forget and survives page unload
        const url = `/api/heartbeat?event=tab_close`;
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url);
        } else {
          // Fallback for older browsers
          fetch(url, { method: "POST", keepalive: true }).catch(() => {});
        }
        return;
      }

      // Regular heartbeat via fetch
      const sessionToken = typeof window !== "undefined" ? localStorage.getItem("app_session_token") : null;
      const clientSent = Date.now();
      const res = await fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, sessionToken }),
      });

      if (res.status === 401) {
        let isConcurrent = false;
        try {
          const resData = await res.json();
          if (resData.error === "concurrent_session") {
            isConcurrent = true;
          }
        } catch {}

        console.warn("[SessionManager] Server returned 401. Session expired or superseded.");
        if (isMountedRef.current) {
          const isAuthPage = window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/register');
          if (!isAuthPage) {
            const supabase = createClient();
            await supabase.auth.signOut().catch(() => {});
            if (isConcurrent) {
              toast.warning("Your account was logged into on another device or browser.", {
                position: "top-center",
                autoClose: 4000
              });
              router.push("/login?reason=concurrent_login");
            } else {
              router.push("/login?reason=timeout");
            }
          }
        }
        return;
      }
      
      // Automatic deployment version check & background refresh
      try {
        const buildRes = await fetch("/api/build-info", { cache: "no-store" });
        if (buildRes.ok) {
          const buildData = await buildRes.json();
          if (buildData.buildId) {
            const currentBuild = sessionStorage.getItem("app_active_build_id");
            if (!currentBuild) {
              sessionStorage.setItem("app_active_build_id", buildData.buildId);
            } else if (currentBuild !== buildData.buildId) {
              console.log("[ClientSessionManager] New deployment build detected on server. Synchronizing client frontend:", buildData.buildId);
              sessionStorage.setItem("app_active_build_id", buildData.buildId);
              if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
                window.location.reload();
                return;
              }
            }
          }
        }
      } catch (buildErr) {}

      const clientReceived = Date.now();
      try {
        const data = await res.json();
        if (data.serverTime) {
          // Calculate clock skew offset
          const serverMs = new Date(data.serverTime).getTime();
          const clientMs = (clientSent + clientReceived) / 2;
          const offset = clientMs - serverMs;
          localStorage.setItem("adios_time_offset", offset.toString());
        }
      } catch (e) {}

    } catch (err) {
      // Network error — silently ignore
    }
  }, [router]);

  // ── Start the heartbeat interval ────────────────────────────────
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) return; // Already running
    
    // Send an immediate heartbeat
    sendHeartbeat("heartbeat");
    
    heartbeatRef.current = setInterval(() => {
      // Only send if this tab is the leader
      if (isLeaderRef.current) {
        sendHeartbeat("heartbeat");
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, [sendHeartbeat]);

  // ── Stop the heartbeat interval ─────────────────────────────────
  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // ── Check if the session is still valid (JWT check) ─────────────
  const checkSessionValidity = useCallback(async (): Promise<boolean> => {
    try {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      return !error && !!user;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // ── 1. Cross-tab coordination via BroadcastChannel ──────────
    // Only one tab should send heartbeats to avoid flooding the server.
    // The first tab becomes the "leader". When it closes, another takes over.
    try {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastRef.current = bc;

      // Announce this tab
      bc.postMessage({ type: "tab_open", timestamp: Date.now() });

      bc.onmessage = (event) => {
        const { type, timestamp } = event.data || {};

        if (type === "heartbeat_sent") {
          // Another tab is handling heartbeats — stand down
          isLeaderRef.current = false;
          lastActivityRef.current = timestamp || Date.now();
        }

        if (type === "tab_close") {
          // The leader is closing — this tab should take over
          setTimeout(() => {
            isLeaderRef.current = true;
            if (document.visibilityState === "visible") {
              startHeartbeat();
            }
          }, 500); // Small delay to avoid race with other tabs
        }

        if (type === "activity") {
          // Another tab had user activity — reset our idle tracking too
          lastActivityRef.current = timestamp || Date.now();
        }
      };
    } catch {
      // BroadcastChannel not supported — this tab will be standalone
      isLeaderRef.current = true;
    }

    // ── 2. Visibility change handler ────────────────────────────
    const handleVisibilityChange = async () => {
      try {
        if (document.visibilityState === "visible") {
          // Resume heartbeats
          lastActivityRef.current = Date.now();
          isLeaderRef.current = true;
          startHeartbeat();
        } else {
          // Tab is now hidden — stop heartbeats to save resources
          stopHeartbeat();
        }
      } catch (err) {
        console.error("[SessionManager] Error in visibility change:", err);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // ── 3. User activity tracking ───────────────────────────────
    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const handleActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;

      // Throttle cross-tab IPC broadcast to prevent saturating the main thread
      if (now - lastBroadcastRef.current >= ACTIVITY_BROADCAST_THROTTLE_MS) {
        lastBroadcastRef.current = now;
        try {
          broadcastRef.current?.postMessage({
            type: "activity",
            timestamp: now,
          });
        } catch {}
      }
    };

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });

    // ── 4. Tab close handler & Bulletproof Deployment Sync Auto-Recovery ──────────
    const handleActionMismatch = (msg: string) => {
      if (
        msg.includes('was not found on the server') ||
        msg.includes('failed-to-find-server-action') ||
        msg.includes('Failed to find Server Action') ||
        msg.includes('UnrecognizedActionError') ||
        (msg.includes('Server Action') && msg.includes('not found'))
      ) {
        console.warn('[Deployment Sync] Server Action hash mismatch detected. Auto-refreshing window for new deployment build.');
        if (typeof window !== 'undefined') {
          const lastReload = Number(sessionStorage.getItem("last_action_reload_ts") || 0);
          if (Date.now() - lastReload > 5000) {
            sessionStorage.setItem("last_action_reload_ts", String(Date.now()));
            sessionStorage.removeItem("app_active_build_id");
            window.location.reload();
          }
        }
      }
    };

    const handleGlobalError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const error = 'reason' in event ? event.reason : event.error;
      const msg = typeof error === 'string' ? error : error?.message || '';
      handleActionMismatch(msg);
    };

    // Intercept console.error to catch Server Action errors caught in try/catch blocks
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const combined = args.map(a => (typeof a === 'string' ? a : (a?.message || String(a)))).join(' ');
      handleActionMismatch(combined);
      originalConsoleError.apply(console, args);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalError);

    const handleBeforeUnload = () => {
      // Send a final heartbeat with tab_close event
      sendHeartbeat("tab_close");

      // Notify other tabs that this tab is closing
      try {
        broadcastRef.current?.postMessage({
          type: "tab_close",
          timestamp: Date.now(),
        });
      } catch {}
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // ── 5. Initial session check & heartbeat start ──────────────
    const initTimer = setTimeout(async () => {
      try {
        const isAuthPage = window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/register');
        
        const isValid = await checkSessionValidity();
        if (!isValid) {
          if (!isAuthPage) {
            console.warn("[SessionManager] No valid session on mount. Redirecting to login.");
            window.location.href = "/login?reason=timeout";
          }
          return;
        }

        // Shared session token across all tabs in this browser instance
        let sessionToken = localStorage.getItem("app_session_token");
        if (!sessionToken) {
          sessionToken = crypto.randomUUID();
          localStorage.setItem("app_session_token", sessionToken);
        }

        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            // Register current session with user_master, active_sessions, and auth_session_logs via REST
            await fetch("/api/session/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionToken,
                userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Unknown Browser"
              })
            }).catch(() => {});

            // Subscribe to active_sessions changes (Admin kill OR Concurrent Login on another device/browser)
            const channelName = `active_sessions_${user.id}_${Math.random().toString(36).substring(7)}`;
            const channel = supabase
              .channel(channelName)
              .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "active_sessions", filter: `user_id=eq.${user.id}` },
                async (payload: any) => {
                  const currentToken = typeof window !== "undefined" ? localStorage.getItem("app_session_token") : null;
                  
                  if (payload.eventType === "DELETE") {
                    // Admin killed session from IAM
                    await supabase.auth.signOut().catch(() => {});
                    window.location.href = "/login?reason=terminated";
                  } else if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
                    const newSessionToken = payload.new?.session_token;
                    if (newSessionToken && currentToken && newSessionToken !== currentToken) {
                      console.warn("[SessionManager] Active session superseded by another login. Terminating.");
                      toast.error("You have been logged out because your account was logged in on another device or browser.", {
                        position: "top-center",
                        autoClose: 4000
                      });
                      await supabase.auth.signOut().catch(() => {});
                      setTimeout(() => {
                        window.location.href = "/login?reason=concurrent_login";
                      }, 500);
                    }
                  }
                }
              )
              .subscribe();
              
            // Add channel to cleanup
            (window as any).__active_session_channel = channel;
          }
        } catch (e) {
          console.error("Concurrent session tracking error:", e);
        }

        // Session is valid — start heartbeats
        lastActivityRef.current = Date.now();
        startHeartbeat();
      } catch (err) {
        console.error("[SessionManager] Initialization error:", err);
      }
    }, 100);

    // ── Cleanup ─────────────────────────────────────────────────
    return () => {
      isMountedRef.current = false;
      clearTimeout(initTimer);
      stopHeartbeat();
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

      if ((window as any).__active_session_channel) {
        const supabase = createClient();
        supabase.removeChannel((window as any).__active_session_channel);
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleGlobalError);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
      window.removeEventListener("beforeunload", handleBeforeUnload);

      try {
        broadcastRef.current?.close();
      } catch {}
    };
  }, [checkSessionValidity, router, sendHeartbeat, startHeartbeat, stopHeartbeat]);

  return null;
}
