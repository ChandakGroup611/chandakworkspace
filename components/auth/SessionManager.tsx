"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

// Timeout duration in milliseconds (5 minutes)
const INACTIVITY_TIMEOUT = 5 * 60 * 1000;
// Interval to ping heartbeat in milliseconds (2 minutes)
const HEARTBEAT_INTERVAL = 2 * 60 * 1000;

export function SessionManager() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Exclude auth routes from session management
  const isAuthRoute = pathname?.startsWith("/login") || pathname?.startsWith("/register");

  // Handle user inactivity
  const handleInactivityLogout = async () => {
    if (isAuthRoute) return;
    try {
      await supabase.auth.signOut();
      router.push("/login?reason=timeout");
    } catch (e) {
      console.error("Error logging out on inactivity:", e);
    }
  };

  // Reset inactivity timer on user interaction
  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now();
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    
    inactivityTimerRef.current = setTimeout(() => {
      const now = Date.now();
      if (now - lastActivityRef.current >= INACTIVITY_TIMEOUT) {
        handleInactivityLogout();
      }
    }, INACTIVITY_TIMEOUT);
  };

  // Check auth state and initialize session token
  useEffect(() => {
    if (isAuthRoute) return;

    let mounted = true;

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // If not authenticated and not on an auth route, redirect to login
        router.push("/login");
        return;
      }

      if (mounted) {
        setUserId(session.user.id);
        
        // Generate a random session token for this browser instance if we don't have one
        let token = sessionStorage.getItem("app_session_token");
        if (!token) {
          token = crypto.randomUUID();
          sessionStorage.setItem("app_session_token", token);
        }
        setSessionToken(token);
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, [pathname, isAuthRoute, router, supabase]);

  // Set up interaction listeners for inactivity
  useEffect(() => {
    if (isAuthRoute) return;

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    const handleActivity = () => resetInactivityTimer();

    // Initial timer setup
    resetInactivityTimer();

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthRoute]);

  // Handle Heartbeat
  useEffect(() => {
    if (isAuthRoute || !userId || !sessionToken) return;

    const updateHeartbeat = async () => {
      try {
        await supabase
          .from("active_sessions")
          .upsert({
            user_id: userId,
            session_token: sessionToken,
            last_active_at: new Date().toISOString()
          }, { onConflict: "user_id" });
      } catch (e) {
        console.error("Failed to ping heartbeat", e);
      }
    };

    // Initial ping
    updateHeartbeat();

    heartbeatIntervalRef.current = setInterval(updateHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [isAuthRoute, userId, sessionToken, supabase]);

  // Listen to concurrent session logins via Realtime
  useEffect(() => {
    if (isAuthRoute || !userId || !sessionToken) return;

    const channel = supabase
      .channel(`active_sessions_channel_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "active_sessions",
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newSessionToken = payload.new.session_token;
          // If the token changed to something else, we were logged in from another device
          if (newSessionToken !== sessionToken) {
            alert("You have been logged out because your account was logged in on another device.");
            supabase.auth.signOut().then(() => {
              router.push("/login");
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthRoute, userId, sessionToken, supabase, router]);

  return null; // This component does not render anything
}
